import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"

// ---------------------------------------------------------------
// Diagnostic produits : isole "code applicatif" vs "Supabase".
// Lit .env.local (ne printed jamais les clés).
//   node scripts/diag-products.mjs
// ---------------------------------------------------------------

const env = {}
for (const line of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("ENV manquants dans .env.local (URL / ANON / SERVICE_ROLE)")
  process.exit(1)
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY)
const anon = createClient(SUPABASE_URL, ANON_KEY)

const log = (label, res) => {
  if (res.error) console.log(`  FAIL | ${label} | code=${res.error.code} | ${res.error.message}`)
  else if (res.count != null) console.log(`  OK   | ${label} | lignes affectées=${res.count}`)
  else console.log(`  OK   | ${label}`)
}

const row = {
  name: "__DIAG_TEST__",
  description: "test diagnostic",
  price: 1,
  promotional_price: null,
  category: null,
  subcategory: null,
  subsubcategory: null,
  category_id: null,
  subcategory_id: null,
  subsubcategory_id: null,
  sku: null,
  badge: null,
  low_stock_threshold: 5,
  sizes: [],
  colors: [],
  variants: [],
  images: [],
  is_active: false,
}

console.log("\n=== 1) INSERT avec SERVICE ROLE (ignore le RLS => teste le schéma) ===")
let res = await svc.from("products").insert(row).select("id").single()
log("INSERT service-role (colonles de base, subcategory=null)", res)
const testId = res.data?.id

try {
  if (testId) {
    console.log("\n=== 2) UPDATE avec SERVICE ROLE (subcategory en TABLEAU — nouveau code edit) ===")
    res = await svc
      .from("products")
      .update({ category: "DIAG", subcategory: ["DIAG_SIZE"], subsubcategory: null })
      .eq("id", testId)
      .select("id")
    log("UPDATE subcategory=TABLEAU", res)

    console.log("\n=== 3) UPDATE avec SERVICE ROLE (subcategory en CHAÎNE — ancien code) ===")
    res = await svc.from("products").update({ subcategory: "DIAG_SIZE" }).eq("id", testId).select("id")
    log("UPDATE subcategory=CHAINE (echec attendu si col TEXT[])", res)

    console.log("\n=== 4) Table low_stock_notifications accessible ? ===")
    res = await svc.from("low_stock_notifications").select("id").limit(1)
    log("SELECT low_stock_notifications", res)
  }

  console.log("\n=== 5) INSERT avec clé ANON sans session (simule navigateur non connecté / RLS) ===")
  res = await anon.from("products").insert({ ...row, name: "__DIAG_ANON__" }).select("id")
  log("INSERT anon sans session (echec attendu si pas de policy d'ecriture)", res)
  const anonId = res.data?.[0]?.id

  console.log("\n=== 6) UPDATE avec clé ANON sans session (RLS) ===")
  if (testId) {
    res = await anon.from("products").update({ name: "X" }).eq("id", testId).select("id")
    log("UPDATE anon sans session", res)
  }

  // Nettoyage
  await svc.from("products").delete().eq("id", testId)
  if (anonId) await svc.from("products").delete().eq("id", anonId)
  console.log("\nNettoyage effectué.")
} catch (e) {
  if (testId) await svc.from("products").delete().eq("id", testId)
  console.error("Erreur inattendue:", e)
}
