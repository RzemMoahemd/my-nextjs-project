import type { SupabaseClient } from "@supabase/supabase-js"

type AdminClient = SupabaseClient<any, "public", any>

/**
 * Lit le stock disponible d'une variante spécifique (taille + couleur) d'un produit.
 * Retourne 0 si le produit ou la variante est introuvable.
 * Non bloquant : les erreurs sont attrapées et retournent 0.
 */
export async function getProductVariantStock(
  adminClient: AdminClient,
  productId: string,
  size: string,
  color: string,
): Promise<number> {
  try {
    const { data, error } = await adminClient
      .from("products")
      .select("variants")
      .eq("id", productId)
      .single()

    if (error || !data) {
      return 0
    }

    const variants = data.variants || []
    const variant = Array.isArray(variants)
      ? variants.find((v: any) => v.size === size && v.color === color)
      : null

    if (!variant) {
      return 0
    }

    return Number(variant.quantity ?? 0)
  } catch (error) {
    console.error("[v0] getProductVariantStock error:", productId, size, color, error)
    return 0
  }
}