import type { SupabaseClient } from "@supabase/supabase-js"
import { getAllSettings } from "./settings"
import { getEffectiveThreshold } from "./low-stock"

type AdminClient = SupabaseClient<any, "public", any>

// Vérifie le stock d'un produit et crée/résout les notifications de stock faible.
// L'agrégation se fait par TAILLE (somme des quantités de toutes les couleurs)
// et se compare au seuil effectif : seuil du produit s'il est défini, sinon seuil global (Paramètres > Vente).
// Non bloquant : toutes les erreurs sont attrapées et loggées (jamais throw).
export async function checkLowStock(adminClient: AdminClient, productId: string) {
  try {
    const { data: product, error } = await adminClient
      .from("products")
      .select("id, name, variants, low_stock_threshold")
      .eq("id", productId)
      .single()

    if (error || !product) {
      console.error("[low-stock] Produit introuvable:", productId, error)
      return
    }

    // Seuil global (Paramètres > Vente), utilisé comme défaut
    const settings = await getAllSettings(adminClient)
    // Cascade : seuil du produit (override) > seuil global > repli 5
    const threshold = getEffectiveThreshold(product, settings.stock?.low_stock_threshold)

    // Agrégation du stock par taille (toutes couleurs confondues)
    const stockBySize: Record<string, number> = {}
    for (const variant of product.variants || []) {
      const size = variant.size || "N/A"
      stockBySize[size] = (stockBySize[size] || 0) + Number(variant.quantity ?? 0)
    }

    // Notifications non résolues existantes pour ce produit (indexées par taille)
    const { data: existingRows } = await adminClient
      .from("low_stock_notifications")
      .select("id, size")
      .eq("product_id", productId)
      .eq("is_resolved", false)

    const existingBySize = new Map<string, string>()
    for (const row of existingRows || []) {
      existingBySize.set(row.size, row.id)
    }

    for (const [size, total] of Object.entries(stockBySize)) {
      const existingId = existingBySize.get(size)

      if (total <= threshold) {
        if (existingId) {
          // Mettre à jour la notification existante
          await adminClient
            .from("low_stock_notifications")
            .update({ current_stock: total, threshold, product_name: product.name })
            .eq("id", existingId)
        } else {
          // Créer une nouvelle notification
          await adminClient.from("low_stock_notifications").insert([
            {
              product_id: productId,
              product_name: product.name,
              size,
              current_stock: total,
              threshold,
            },
          ])
        }
        existingBySize.delete(size)
      } else if (existingId) {
        // Stock revenu au-dessus du seuil : résoudre la notification
        await adminClient
          .from("low_stock_notifications")
          .update({ is_resolved: true })
          .eq("id", existingId)
        existingBySize.delete(size)
      }
    }

    // Tailles disparues des variantes : résoudre les notifications orphelines
    if (existingBySize.size > 0) {
      await adminClient
        .from("low_stock_notifications")
        .update({ is_resolved: true })
        .eq("product_id", productId)
        .eq("is_resolved", false)
        .in("size", Array.from(existingBySize.keys()))
    }
  } catch (error) {
    console.error("[low-stock] Check error:", error)
  }
}