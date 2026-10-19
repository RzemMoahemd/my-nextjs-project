import type { SupabaseClient } from "@supabase/supabase-js"
import { getProductVariantStock } from "./inventory-read"

type AdminClient = SupabaseClient<any, "public", any>

interface StockCheckResult {
  available: boolean
  insufficientItems: Array<{
    product_id: string
    size: string
    color: string
    requested: number
    available: number
  }>
}

/**
 * Vérifie que le stock est suffisant pour tous les items d'une commande
 * AVANT de permettre la confirmation.
 *
 * Cette fonction est en lecture seule (ne modifie pas le stock). Elle doit être appelée
 * AVANT la déduction réelle pour éviter de confirmer une commande qui sera ensuite
 * impossible à honorer.
 *
 * L'agrégation se fait par variante (size + color).
 * Non bloquant : toutes les erreurs sont attrapées et considérées comme "stock disponible"
 * pour ne pas bloquer les commandes en cas de problème technique temporaire.
 */
export async function verifyStockAvailability(
  adminClient: AdminClient,
  items: Array<{
    product_id: string
    size: string
    color?: string
    quantity: number
  }>,
): Promise<StockCheckResult> {
  const insufficientItems: StockCheckResult["insufficientItems"] = []

  for (const item of items) {
    if (!item.product_id || !item.size || !item.quantity) continue

    const color = item.color || "Standard"

    try {
      const available = await getProductVariantStock(adminClient, item.product_id, item.size, color)

      if (available < item.quantity) {
        insufficientItems.push({
          product_id: item.product_id,
          size: item.size,
          color,
          requested: item.quantity,
          available,
        })
      }
    } catch (error) {
      console.error("[v0] Stock check error for item:", item.product_id, item.size, color, error)
      // En cas d'erreur technique, on considère le stock comme disponible
      // pour ne pas bloquer les commandes. La déduction réelle (T01) refusera si insuffisant.
    }
  }

  return {
    available: insufficientItems.length === 0,
    insufficientItems,
  }
}