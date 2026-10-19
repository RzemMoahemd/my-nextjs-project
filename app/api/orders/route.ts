import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { verifyStockAvailability } from "@/lib/confirm-order-stock"

// GET - Récupérer toutes les commandes (admin)
export async function GET() {
  try {
    const serverClient = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
    } = await serverClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: adminUser } = await serverClient.from("admin_users").select("*").eq("id", user.id).single()

    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: orders, error } = await adminClient.from("orders").select("*").order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(orders)
  } catch (error) {
    console.error("[v0] Orders fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

interface CouponInfo {
  code?: string
  discount?: number
  freeShipping?: boolean
}

// POST - Créer une commande (client)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const adminClient = createAdminClient()

    const {
      customer_name: initialCustomerName,
      customer_phone: initialCustomerPhone,
      customer_email,
      address: initialAddress,
      postal_code: initialPostalCode,
      city: initialCity,
      items,
      notes,
      reservations,
      coupon
    } = body

    // Variables modifiables pour les informations client
    let customer_name = initialCustomerName
    let customer_phone = initialCustomerPhone
    let address = initialAddress
    let postal_code = initialPostalCode
    let city = initialCity

    if (!customer_name || !customer_phone || !address || !city || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.price) * Number(item.quantity), 0)

    // Récupérer les frais de livraison
    const { data: settings } = await adminClient.from("settings").select("value").eq("key", "delivery_fee").single()
    const deliveryFee = Number(settings?.value?.amount ?? 0)

    // Récupérer le profil utilisateur si il y en a un
    let customerInfo = {
      customer_name,
      customer_phone,
      customer_email: customer_email || undefined
    }

    // Variable pour stocker l'ID utilisateur authentifié
    let authUserId: string | undefined

    // Essayer de récupérer les informations depuis le profil utilisateur
    try {
      const client = await createClient()
      const { data: { user: authUser } } = await client.auth.getUser()

      if (authUser) {
        authUserId = authUser.id // Stocker l'ID utilisateur

        const { data: userProfile } = await client
          .from("user_profiles")
          .select("*")
          .eq("user_id", authUser.id)
          .maybeSingle()

        if (userProfile) {
          customerInfo = {
            customer_name: userProfile.full_name || customer_name,
            customer_phone: userProfile.phone || customer_phone,
            customer_email: userProfile.phone ? undefined : (userProfile.email || customer_email) // Use auth email if no profile phone
          }
          // Pré-remplir l'adresse depuis le profil
          address = userProfile.address || address
          postal_code = userProfile.postal_code || postal_code || undefined
          city = userProfile.city || city
        }
      }
    } catch (profileError) {
      console.log("[v0] Could not load user profile, using form data:", profileError)
      // Continue avec les données du formulaire
    }

    // Calculer le total avec les remises
    let totalAmount = subtotal + deliveryFee
    let finalDeliveryFee = deliveryFee
    let couponDiscount = 0
    let freeShippingFromCoupon = false
    let couponCode: string | undefined

    // Appliquer le coupon si présent
    if (coupon && typeof coupon === 'object') {
      const couponInfo: CouponInfo = coupon
      couponCode = couponInfo.code
      couponDiscount = couponInfo.discount || 0
      freeShippingFromCoupon = couponInfo.freeShipping || false

      // Ajuster les frais de livraison si livraison gratuite depuis coupon
      if (freeShippingFromCoupon) {
        finalDeliveryFee = 0
      }

      // Recalculer le total avec la remise
      const subtotalAfterDiscount = Math.max(0, subtotal - couponDiscount)
      totalAmount = subtotalAfterDiscount + finalDeliveryFee

      // Incrémenter le compteur d'utilisation du coupon
      if (couponCode) {
        const { data: couponData } = await adminClient
          .from('coupons')
          .select('current_uses')
          .eq('code', couponCode.toUpperCase())
          .single()

        if (couponData) {
          await adminClient
            .from('coupons')
            .update({ current_uses: couponData.current_uses + 1 })
            .eq('code', couponCode.toUpperCase())
        }
      }
    }

    // T03 : Vérifier le stock AVANT de créer la commande
    // Empêche de vendre un produit dont la réservation a expiré entre-temps
    if (Array.isArray(items) && items.length > 0) {
      const stockCheck = await verifyStockAvailability(
        adminClient,
        items.map((item: any) => ({
          product_id: item.product_id,
          size: item.size,
          color: item.color,
          quantity: Number(item.quantity),
        }))
      )

      if (!stockCheck.available) {
        console.error("[v0] Stock insufficient for order creation:", stockCheck.insufficientItems)
        return NextResponse.json(
          {
            error: "Stock insuffisant pour certains articles",
            details: stockCheck.insufficientItems,
          },
          { status: 400 }
        )
      }
    }

    // T05 : Création de commande atomique (insertion commande + suppression réservations dans une transaction)
    const reservationIds = Array.isArray(reservations) ? reservations : []
    const { data: orderData, error: orderError } = await adminClient
      .rpc("create_order_from_reservations", {
        p_customer_name: customer_name,
        p_customer_phone: customer_phone,
        p_customer_email: customer_email || null,
        p_address: address,
        p_postal_code: postal_code,
        p_city: city,
        p_items: items,
        p_total_amount: totalAmount,
        p_delivery_fee: finalDeliveryFee,
        p_notes: notes || null,
        p_coupon_code: couponCode || null,
        p_coupon_discount: couponDiscount,
        p_free_shipping_from_coupon: freeShippingFromCoupon,
        p_user_id: authUserId || null,
        p_reservation_ids: reservationIds.length > 0 ? reservationIds : null,
      })
      .single() as { data: { order_id: string; success: boolean; error_message: string | null } | null; error: any }

    if (orderError || !orderData?.success) {
      console.error('[orders] Order creation error:', orderData?.error_message ?? orderError)
      throw new Error(orderData?.error_message ?? 'Failed to create order')
    }

    return NextResponse.json({ id: orderData.order_id }, { status: 201 })
  } catch (error) {
    console.error("[v0] Order creation error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
