import type { SupabaseClient } from "@supabase/supabase-js"

type AdminClient = SupabaseClient<any, "public", any>

export async function adjustInventoryQuantity(
  adminClient: AdminClient,
  productId: string,
  size: string,
  color: string,
  delta: number,
) {
  const { data, error } = await adminClient.from("products").select("variants").eq("id", productId).single()
  if (error || !data) {
    throw new Error("Product not found")
  }

  const variants = data.variants || []
  const variantIndex = variants.findIndex((v: any) => v.size === size && v.color === color)
  
  if (variantIndex === -1) {
    throw new Error("Variant not found")
  }

  const currentQuantity = Number(variants[variantIndex].quantity ?? 0)
  const nextValue = currentQuantity + delta

  if (nextValue < 0) {
    throw new Error("Insufficient stock")
  }

  // Mettre à jour la quantité de la variante
  variants[variantIndex].quantity = nextValue

  // Calculer si le produit est toujours actif (au moins une variante avec stock > 0)
  const hasStock = variants.some((v: any) => Number(v.quantity) > 0)

  const { error: updateError } = await adminClient
    .from("products")
    .update({ variants })
    .eq("id", productId)

  if (updateError) {
    throw updateError
  }
}

export async function cleanupExpiredReservations(adminClient: AdminClient) {
  const now = new Date().toISOString()
  const { data: expired, error } = await adminClient
    .from("cart_reservations")
    .delete()
    .lt("expires_at", now)
    .select("product_id,size,color,quantity")

  if (error) {
    throw error
  }

  if (!expired || expired.length === 0) {
    return
  }

  for (const reservation of expired) {
    try {
      await adjustInventoryQuantity(
        adminClient, 
        reservation.product_id, 
        reservation.size, 
        reservation.color || 'Standard',
        reservation.quantity
      )
    } catch (err) {
      console.error('[inventory] Failed to restore reservation:', err)
    }
  }
}