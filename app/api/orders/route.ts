import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { verifyStockAvailability } from "@/lib/confirm-order-stock"
import { pickRpcRow, cleanupExpiredReservations } from "@/lib/inventory"

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

// Prix de vente réel d'un produit : le prix promo s'il est valide, sinon le prix normal.
// (même règle que lib/product-badges.ts côté serveur pour ne pas faire confiance au client)
function getEffectivePrice(product: { price: number; promotional_price?: number | null }): number {
  const base = Number(product.price)
  const promo = product.promotional_price != null ? Number(product.promotional_price) : null
  if (promo != null && Number.isFinite(promo) && promo > 0 && promo < base) return promo
  return base
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

    // N2 : Ne JAMAIS faire confiance aux prix envoyés par le client.
    // On relit chaque produit en base, on vérifie qu'il est actif, et on recalcule
    // le sous-total avec les vrais prix (promo incluse). Les items de la commande
    // sont réécrits avec ces prix serveur (nom/photo rafraîchis aussi).
    const productIds = [...new Set(items.map((item: any) => item.product_id).filter(Boolean))]
    if (productIds.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: dbProducts, error: productsError } = await adminClient
      .from("products")
      .select("id, name, price, promotional_price, images, is_active, category")
      .in("id", productIds)

    if (productsError) throw productsError

    const dbById = new Map((dbProducts ?? []).map((p: any) => [p.id, p]))
    const serverItems: Array<{
      product_id: string
      name: string
      size: string
      color?: string
      quantity: number
      price: number
    }> = []

    for (const item of items) {
      const db = dbById.get(item.product_id)
      const quantity = Math.floor(Number(item.quantity))
      if (!db || !item.size || !Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ error: "Article invalide dans la commande" }, { status: 400 })
      }
      if (db.is_active === false) {
        return NextResponse.json(
          { error: `Le produit "${db.name}" n'est plus disponible` },
          { status: 400 },
        )
      }
      const price = getEffectivePrice(db)
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: "Prix produit invalide" }, { status: 500 })
      }
      serverItems.push({
        product_id: item.product_id,
        name: db.name,
        size: item.size,
        color: item.color,
        quantity,
        price,
      })
    }

    const subtotal = serverItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

    // Récupérer les frais de livraison + seuil de livraison gratuite (serveur)
    const { data: settings } = await adminClient.from("settings").select("value").eq("key", "delivery_fee").single()
    const deliveryFee = Number(settings?.value?.amount ?? 0)
    const { data: freeShipRow } = await adminClient.from("settings").select("value").eq("key", "free_shipping").single()
    const freeShipValue = freeShipRow?.value as { threshold?: number; enabled?: boolean } | null
    const freeShipThreshold = Number(freeShipValue?.threshold ?? 0)
    const freeShipEnabled = Boolean(freeShipValue?.enabled ?? false)

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

    // N3 : le coupon est RE-VÉRIFIÉ ici (actif, non expiré, sous la limite,
    // minimum respecté, applicable au panier) et la remise est RECALCULÉE côté
    // serveur. On ignore les montants envoyés par le client.
    if (coupon && typeof coupon === 'object') {
      const couponInfo: CouponInfo = coupon
      const code = (couponInfo.code || "").toUpperCase().trim()
      if (!code) {
        return NextResponse.json({ error: "Code promo invalide" }, { status: 400 })
      }

      const { data: dbCoupon, error: couponError } = await adminClient
        .from('coupons')
        .select('*')
        .eq('code', code)
        .maybeSingle()

      if (couponError || !dbCoupon) {
        return NextResponse.json({ error: "Code promo invalide" }, { status: 400 })
      }
      if (dbCoupon.is_active !== true) {
        return NextResponse.json({ error: "Ce code promo n'est plus actif" }, { status: 400 })
      }
      if (dbCoupon.expiration_date && new Date(dbCoupon.expiration_date) < new Date()) {
        return NextResponse.json({ error: "Ce code promo a expiré" }, { status: 400 })
      }
      if (dbCoupon.max_uses != null && Number(dbCoupon.current_uses ?? 0) >= Number(dbCoupon.max_uses)) {
        return NextResponse.json({ error: "Ce code promo a atteint sa limite d'utilisation" }, { status: 400 })
      }
      if (subtotal < Number(dbCoupon.minimum_order ?? 0)) {
        return NextResponse.json(
          { error: `Montant minimum requis: ${dbCoupon.minimum_order}` },
          { status: 400 },
        )
      }
      // Produits / catégories applicables (si définis, au moins 1 article doit correspondre)
      const applicableProducts = Array.isArray(dbCoupon.applicable_products) ? dbCoupon.applicable_products : null
      const applicableCategories = Array.isArray(dbCoupon.applicable_categories) ? dbCoupon.applicable_categories : null
      if ((applicableProducts && applicableProducts.length > 0) || (applicableCategories && applicableCategories.length > 0)) {
        const productCategoryById = new Map((dbProducts ?? []).map((p: any) => [p.id, p.category ?? p.name]))
        const matches = serverItems.some((item) => {
          if (applicableProducts && applicableProducts.length > 0 && applicableProducts.includes(item.product_id)) return true
          if (applicableCategories && applicableCategories.length > 0) {
            const cat = productCategoryById.get(item.product_id)
            if (cat && applicableCategories.includes(cat)) return true
          }
          return false
        })
        if (!matches) {
          return NextResponse.json({ error: "Ce code promo n'est pas applicable à votre panier" }, { status: 400 })
        }
      }

      // Remise recalculée serveur (jamais celle du client)
      couponCode = dbCoupon.code
      if (dbCoupon.type === 'percentage') {
        couponDiscount = Math.min(subtotal, (subtotal * Number(dbCoupon.value ?? 0)) / 100)
      } else if (dbCoupon.type === 'fixed') {
        couponDiscount = Math.min(subtotal, Number(dbCoupon.value ?? 0))
      } else if (dbCoupon.type === 'free_shipping') {
        freeShippingFromCoupon = true
      }
      couponDiscount = Math.max(0, Math.round(couponDiscount * 100) / 100)

      // Livraison gratuite : coupon prioritaire, sinon seuil automatique (calcul serveur)
      if (freeShippingFromCoupon) {
        finalDeliveryFee = 0
      } else if (freeShipEnabled && subtotal - couponDiscount >= freeShipThreshold && serverItems.length > 0) {
        finalDeliveryFee = 0
      }

      // Recalculer le total avec la remise
      const subtotalAfterDiscount = Math.max(0, subtotal - couponDiscount)
      totalAmount = subtotalAfterDiscount + finalDeliveryFee
    } else {
      // Sans coupon : le seuil de livraison gratuite s'applique quand même (calcul serveur)
      if (freeShipEnabled && subtotal >= freeShipThreshold && serverItems.length > 0) {
        finalDeliveryFee = 0
      }
      totalAmount = subtotal + finalDeliveryFee
    }

    // T03 : Vérifier le stock AVANT de créer la commande (sur les items serveur)
    // Empêche de vendre un produit dont la réservation a expiré entre-temps
    if (serverItems.length > 0) {
      const stockCheck = await verifyStockAvailability(
        adminClient,
        serverItems.map((item) => ({
          product_id: item.product_id,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
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

    // N6 : la reservation a pu expirer entre le panier et le clic "valider".
    // On nettoie d'abord les expirees (rend le stock), puis la fonction SQL
    // `confirm_order_reservations` re-bloque atomiquement ce qui manque.
    await cleanupExpiredReservations(adminClient)

    // N4 : on consomme UN usage du coupon AVANT de créer la commande, en une
    // seule opération atomique (verrou en base). Si 2 clients valident en même
    // temps avec le dernier usage, un seul passe, l'autre est refusé ici.
    // Si la commande échoue ensuite, l'usage est rendu (compensation).
    let couponConsumed = false
    if (couponCode) {
      const { data: incRows, error: incError } = await adminClient
        .rpc("increment_coupon_use", { p_code: couponCode })

      const inc = pickRpcRow(
        incRows as { success: boolean; error_message: string | null }[] | null,
      )
      if (incError || !inc?.success) {
        return NextResponse.json(
          { error: inc?.error_message ?? "Ce code promo n'est plus utilisable" },
          { status: 400 },
        )
      }
      couponConsumed = true
    }

    const reservationIds = Array.isArray(reservations) ? reservations : []

    if (reservationIds.length > 0) {
      const { data: ownReservations } = await adminClient
        .from("cart_reservations")
        .select("id, expires_at")
        .in("id", reservationIds)

      const ownIds = new Set((ownReservations ?? []).map((r: any) => r.id))
      const missing = reservationIds.filter((id: string) => !ownIds.has(id))
      if (missing.length > 0) {
        // Au moins une reservation a disparu (expiree/nettoyee) : on continue,
        // la fonction SQL re-bloquera le stock si disponible, sinon echec propre.
        console.log("[orders] Some reservations expired before checkout:", missing.length)
      }
    }

    // T05+N6 : creation de commande atomique avec re-validation des reservations.
    // (fonction SQL multi-RETURN QUERY -> tableau, pas .single())
    // On enregistre les items SERVEUR (prix recalcules), jamais ceux du client.
    const { data: orderRows, error: orderError } = await adminClient
      .rpc("confirm_order_reservations", {
        p_customer_name: customer_name,
        p_customer_phone: customer_phone,
        p_customer_email: customer_email || null,
        p_address: address,
        p_postal_code: postal_code,
        p_city: city,
        p_items: serverItems,
        p_total_amount: totalAmount,
        p_delivery_fee: finalDeliveryFee,
        p_notes: notes || null,
        p_coupon_code: couponCode || null,
        p_coupon_discount: couponDiscount,
        p_free_shipping_from_coupon: freeShippingFromCoupon,
        p_user_id: authUserId || null,
        p_reservation_ids: reservationIds.length > 0 ? reservationIds : null,
      })

    const orderData = pickRpcRow(
      orderRows as { order_id: string | null; success: boolean; error_message: string | null }[] | null,
      ["order_id"],
    )

    if (orderError || !orderData?.success) {
      const msg = orderData?.error_message ?? orderError?.message ?? 'Failed to create order'
      console.error('[orders] Order creation error:', msg)
      // N4 : la commande a échoué alors qu'on avait consommé un usage coupon :
      // on le rend pour ne pas pénaliser le client.
      if (couponConsumed && couponCode) {
        const { error: decError } = await adminClient
          .rpc("decrement_coupon_use", { p_code: couponCode })
        if (decError) {
          console.error('[orders] Failed to refund coupon use:', decError)
        }
      }
      // N6 : message clair quand la reservation a expire et le stock est parti
      if (msg.includes('expiree') || msg.includes('insuffisant') || msg.includes('Insuffisant')) {
        return NextResponse.json(
          {
            error: "CART_EXPIRED",
            message: "Votre panier a expiré ou un article n'est plus en stock. Veuillez vérifier votre panier et réessayer.",
            details: msg,
          },
          { status: 409 },
        )
      }
      throw new Error(msg)
    }

    // N4 : l'usage a déjà été consommé AVANT la commande (voir plus haut),
    // rien à faire ici : succès = usage conservé.

    return NextResponse.json({ id: orderData.order_id }, { status: 201 })
  } catch (error) {
    console.error("[v0] Order creation error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
