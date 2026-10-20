import type { SupabaseClient } from "@supabase/supabase-js"
import { checkLowStock } from "./check-low-stock"

type AdminClient = SupabaseClient<any, "public", any>

// Les fonctions SQL T05 utilisent plusieurs `RETURN QUERY` (un par branche d'erreur).
// postgREST renvoie donc TOUJOURS un tableau de N lignes, jamais une seule ligne.
// Ne JAMAIS appeler .single() sur ces RPC : on extrait la ligne significative.
// Pour reserve/create : la ligne avec l'id non null. Pour les autres : success === true,
// sinon la premiere ligne (qui contient error_message).
export function pickRpcRow<T>(rows: T | T[] | null, idKeys: (keyof T)[] = []): T | undefined {
  const arr = Array.isArray(rows) ? rows : rows ? [rows] : []
  if (arr.length === 0) return undefined
  if (idKeys.length > 0) {
    const withId = arr.find((r) => r && idKeys.some((k) => (r as any)[k] != null))
    if (withId) return withId
  }
  const ok = arr.find((r) => r && (r as any).success === true)
  return ok ?? arr[0]
}

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
  return (Number.isFinite(Number(allSettings?.reservation_duration_minutes)) ? Number(allSettings.reservation_duration_minutes) : 15) * 60000
}

export async function getReservationDurationMsCached(allSettings: any): Promise<number> {
  return (Number.isFinite(Number(allSettings?.reservation_duration_minutes)) ? Number(allSettings.reservation_duration_minutes) : 15) * 60000
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