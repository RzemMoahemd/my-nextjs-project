import type { SupabaseClient } from "@supabase/supabase-js"
import { checkLowStock } from "./check-low-stock"

type AdminClient = SupabaseClient<any, "public", any>

interface AdjustInventoryResult {
  new_quantity: number
  success: boolean
  error_message: string | null
}

export async function adjustInventoryQuantity(
  adminClient: AdminClient,
  productId: string,
  size: string,
  color: string,
  delta: number,
) {
  // Appel atomique via RPC : la fonction PostgreSQL verrouille la ligne (FOR UPDATE)
  // et refuse si le stock deviendrait négatif. Pas de race condition possible.
  const { data, error } = await adminClient
    .rpc("adjust_inventory_quantity", {
      p_product_id: productId,
      p_size: size,
      p_color: color,
      p_delta: delta,
    })
    .single()

  if (error) {
    throw error
  }

  const result = data as AdjustInventoryResult | null

  if (!result?.success) {
    throw new Error(result?.error_message ?? "Inventory adjustment failed")
  }

  // Recalculer les notifications de stock faible après chaque mouvement de stock
  await checkLowStock(adminClient, productId)

  return result.new_quantity
}

export async function getReservationDurationMs(allSettings: any): Promise<number> {
  return (Number(allSettings?.reservation_duration_minutes) || 15) * 60000
}

export async function getReservationDurationMsCached(allSettings: any): Promise<number> {
  return (Number(allSettings?.reservation_duration_minutes) || 15) * 60000
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