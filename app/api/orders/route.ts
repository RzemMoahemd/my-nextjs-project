import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

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

    const { data: order, error } = await adminClient
      .from("orders")
      .insert([
        {
          customer_name,
          customer_phone,
          customer_email,
          address,
          postal_code,
          city,
          items,
          total_amount: totalAmount,
          delivery_fee: finalDeliveryFee,
          notes,
          status: "pending",
          coupon_code: couponCode,
          coupon_discount: couponDiscount,
          free_shipping_from_coupon: freeShippingFromCoupon,
          user_id: authUserId, // ID de l'utilisateur authentifié
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[orders] Insert error:', error)
      throw error
    }

    // Libérer les réservations de panier
    if (Array.isArray(reservations) && reservations.length > 0) {
      await adminClient.from("cart_reservations").delete().in("id", reservations)
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("[v0] Order creation error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
