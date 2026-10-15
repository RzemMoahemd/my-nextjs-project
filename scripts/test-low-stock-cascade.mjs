// Test de la cascade seuil de stock faible (logique identique à lib/low-stock.ts)
// Usage : node scripts/test-low-stock-cascade.mjs

const DEFAULT_LOW_STOCK_THRESHOLD = 5

function parseThreshold(value) {
  if (value == null || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function getEffectiveThreshold(product, globalThreshold) {
  const pt = parseThreshold(product && product.low_stock_threshold)
  if (pt != null) return pt
  const g = parseThreshold(globalThreshold)
  if (g != null) return g
  return DEFAULT_LOW_STOCK_THRESHOLD
}

function parseThresholdInput(value) {
  return parseThreshold(value)
}

const cases = [
  ["produit null, global 5 -> 5", { low_stock_threshold: null }, 5, 5],
  ["produit 20, global 5 -> 20 (override)", { low_stock_threshold: 20 }, 5, 20],
  ["produit null, global undefined -> 5", { low_stock_threshold: null }, undefined, 5],
  ["produit 0, global 5 -> 0 (respecte)", { low_stock_threshold: 0 }, 5, 0],
  ['produit "" (champ vide), global 8 -> 8', { low_stock_threshold: "" }, 8, 8],
  ['produit "abc", global 3 -> 3', { low_stock_threshold: "abc" }, 3, 3],
  ["global 0 -> 0 (desactive)", { low_stock_threshold: null }, 0, 0],
  ["aucun seuil nulle part -> 5", {}, null, 5],
]

let ok = true
for (const [label, product, global, expected] of cases) {
  const got = getEffectiveThreshold(product, global)
  const pass = got === expected
  if (!pass) ok = false
  console.log(pass ? "OK  " : "FAIL", label, "=> got", got)
}

// Scénario réel : produit "deeds" sans override, stock par taille L=6 / m=3
const deeds = { low_stock_threshold: null }
const t = getEffectiveThreshold(deeds, 5)
console.log("deeds seuil effectif:", t, "| taille m stock 3 -> alerte faible ?", 3 <= t, "| taille L stock 6 -> alerte ?", 6 <= t)

// Normalisation API / formulaire
console.log('parse "" ->', parseThresholdInput(""), '| "12" ->', parseThresholdInput("12"), '| "abc" ->', parseThresholdInput("abc"), "| undefined ->", parseThresholdInput(undefined))

console.log(ok ? "\nTOUS LES TESTS PASSENT" : "\nECHEC")
process.exit(ok ? 0 : 1)
