// =================================================
// SEUIL DE STOCK FAIBLE — CASCADE PRODUIT > GLOBAL
// =================================================
//
// Règle unique appliquée partout (dashboard, notifications, alertes) :
//   1. seuil du produit  (products.low_stock_threshold, si défini)
//   2. seuil global      (Paramètres > Vente : stock.low_stock_threshold)
//   3. repli de sécurité (5)
//
// `null` / chaîne vide sur le produit = hérite du seuil global.
// Un seuil explicite à 0 est respecté : seule la rupture (stock = 0)
// déclenche alors une alerte "stock faible".

export const DEFAULT_LOW_STOCK_THRESHOLD = 5

interface ThresholdAware {
  low_stock_threshold?: number | string | null
}

function parseThreshold(value: unknown): number | null {
  if (value == null || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

/**
 * Retourne le seuil de stock faible effectif d'un produit.
 * Un seuil du produit (même 0) écrase le seuil global.
 */
export function getEffectiveThreshold(
  product?: ThresholdAware | null,
  globalThreshold?: number | string | null
): number {
  const productThreshold = parseThreshold(product?.low_stock_threshold)
  if (productThreshold != null) return productThreshold

  const global = parseThreshold(globalThreshold)
  if (global != null) return global

  return DEFAULT_LOW_STOCK_THRESHOLD
}

/**
 * Seuil d'AFFICHAGE du message "Plus que X disponible" côté client.
 *
 * Contrairement à getEffectiveThreshold, ce seuil dépend UNIQUEMENT du réglage
 * global (Paramètres > Vente : stock.low_stock_display_threshold). Il ignore
 * volontairement le low_stock_threshold défini dans la fiche produit, afin que
 * ce dernier ne serve qu'aux notifications admin (tableau de bord).
 *
 * Un 0 explicite est respecté (désactive le message). Toute valeur invalide ou
 * absente retombe sur le repli de sécurité.
 */
export function getDisplayThreshold(globalThreshold?: number | string | null): number {
  const global = parseThreshold(globalThreshold)
  if (global != null) return global
  return DEFAULT_LOW_STOCK_THRESHOLD
}

/**
 * Normalise une saisie de seuil (formulaire produit ou API) :
 * `undefined` / `null` / `""` / valeur invalide => `null` (héritage du global).
 */
export function parseThresholdInput(value: unknown): number | null {
  return parseThreshold(value)
}