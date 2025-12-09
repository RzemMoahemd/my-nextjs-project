import { createAdminClient } from "./supabase-admin"

export async function checkLowStock(productId: string, productName: string, inventory: Record<string, number>, threshold: number = 5) {
  try {
    const adminClient = createAdminClient()
    
    for (const [size, quantity] of Object.entries(inventory)) {
      if (quantity <= threshold && quantity >= 0) {
        // Vérifier si une notification existe déjà pour ce produit/taille
        const { data: existing } = await adminClient
          .from("low_stock_notifications")
          .select("*")
          .eq("product_id", productId)
          .eq("size", size)
          .eq("is_resolved", false)
          .single()

        if (!existing) {
          // Créer une nouvelle notification
          await adminClient.from("low_stock_notifications").insert([
            {
              product_id: productId,
              product_name: productName,
              size,
              current_stock: quantity,
              threshold,
            },
          ])
        } else {
          // Mettre à jour la notification existante
          await adminClient
            .from("low_stock_notifications")
            .update({ current_stock: quantity })
            .eq("id", existing.id)
        }
      } else if (quantity > threshold) {
        // Résoudre les notifications si le stock est revenu au-dessus du seuil
        await adminClient
          .from("low_stock_notifications")
          .update({ is_resolved: true })
          .eq("product_id", productId)
          .eq("size", size)
          .eq("is_resolved", false)
      }
    }
  } catch (error) {
    console.error("[v0] Check low stock error:", error)
  }
}