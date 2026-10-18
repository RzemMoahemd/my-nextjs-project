// ============================================================
// Helpers badges produits — source unique de vérité
// Règles :
//  1. RUPTURE DE STOCK (totalStock <= 0) => JAMAIS de badge PROMO.
//  2. PROMO = prix promotionnel valide (promotional_price < price)
//     + stock disponible (> 0). Peut être stocké (badge='promo')
//     ou dérivé du prix.
//  3. NOUVEAU / TOP VENTE = badge stocké en BDD (new / top_sale).
// ============================================================
import type { Product } from "@/lib/types"

export type BadgeKind = "new" | "top_sale" | "promo"

export function getTotalStock(product: Pick<Product, "variants">): number {
  // Si variants absent (ex. payload partiel du navbar), on ne peut pas conclure
  // à une rupture : on retourne NaN-like via null-check dans isOutOfStock.
  if (!product.variants) return -1
  return product.variants.reduce((sum, v) => sum + (v.quantity ?? 0), 0) ?? 0
}

export function isOutOfStock(product: Pick<Product, "variants">): boolean {
  const total = getTotalStock(product)
  // variants manquants => on considère EN STOCK (pas de fausse rupture)
  if (total < 0) return false
  return total <= 0
}

/** Prix promo valide ? (remise réelle, sans tenir compte du stock) */
export function hasValidPromoPrice(
  product: Pick<Product, "price" | "promotional_price">
): boolean {
  return (
    product.promotional_price != null &&
    product.promotional_price > 0 &&
    product.promotional_price < product.price
  )
}

/**
 * Badge PROMO actif : remise réelle + stock disponible.
 * En rupture de stock => TOUJOURS false (jamais de PROMO).
 */
export function hasActivePromo(
  product: Pick<Product, "price" | "promotional_price" | "variants" | "badge">
): boolean {
  if (isOutOfStock(product)) return false
  if (product.badge === "promo") return hasValidPromoPrice(product)
  return hasValidPromoPrice(product)
}

/** Pourcentage de remise arrondi (ex. 25 pour -25%). 0 si pas de promo. */
export function getDiscountPercent(
  product: Pick<Product, "price" | "promotional_price">
): number {
  if (!hasValidPromoPrice(product)) return 0
  return Math.round(
    ((product.price - (product.promotional_price as number)) / product.price) * 100
  )
}

/** Badge stocké à afficher (new / top_sale). 'promo' est géré via hasActivePromo. */
export function getStoredBadge(
  product: Pick<Product, "badge">
): "new" | "top_sale" | null {
  if (product.badge === "new" || product.badge === "top_sale") return product.badge
  return null
}
