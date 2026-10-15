import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"

// ---------------------------------------------------------------
// Diagnose why a specific product doesn't display.
//   node scripts/diag-product-display.mjs "deeds"
// ---------------------------------------------------------------

const NAME = process.argv[2] || "deeds"

const env = {}
for (const line of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
}

const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const { data: target, error: err1 } = await svc
  .from("products")
  .select("*")
  .ilike("name", `%${NAME}%`)
if (err1) console.log("ERREUR select:", err1.code, err1.message)

console.log(`\n=== Produits contenant "${NAME}" : ${(target || []).length} trouvé(s) ===`)
for (const p of target || []) {
  console.log(JSON.stringify(p, null, 2))
}

const { data: others } = await svc
  .from("products")
  .select("name, is_active, in_stock, price, promotional_price, images, category, subcategory, sizes, colors, variants, sku, badge, created_at")
  .order("created_at", { ascending: false })
  .limit(5)

console.log("\n=== 5 derniers produits (référence, pour comparaison) ===")
for (const p of others || []) {
  console.log(
    JSON.stringify({
      name: p.name,
      is_active: p.is_active,
      in_stock: p.in_stock,
      price: p.price,
      promo: p.promotional_price,
      nb_images: (p.images || []).length,
      first_image: (p.images || [])[0] || null,
      category: p.category,
      subcategory: p.subcategory,
      sizes: p.sizes,
      colors: p.colors,
      nb_variants: (p.variants || []).length,
      sku: p.sku,
      badge: p.badge,
    })
  )
}

const { count: total } = await svc.from("products").select("*", { count: "exact", head: true })
const { count: active } = await svc.from("products").select("*", { count: "exact", head: true }).eq("is_active", true)
console.log(`\nTotal produits=${total} | is_active=true=${active}`)
