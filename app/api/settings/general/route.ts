import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { getAllSettings, saveSetting, WRITABLE_SETTING_KEYS, type AllSettings } from "@/lib/settings"

// Vérifie qu'une valeur n'est PAS un dataURL (au cas où un ancien format
// serait envoyé, on refuse explicitement pour éviter de polluer la BD).
function isDataUrl(value: string): boolean {
  return /^data:[^;]+;base64,[A-Za-z0-9+/=]+$/.test(value)
}

// Vérifie qu'une valeur est une URL valide (http(s) ou chemin absolu)
function isValidUrl(value: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "file:"
  } catch {
    return false
  }
}

// Champs de type URL dans l'objet homepage / store_info
const URL_FIELDS = new Set([
  "hero_image_url",   // homepage
  "category_images",  // homepage (les valeurs en sont des URLs)
  "logo_url",         // store_info
  "favicon_url",      // store_info
  "og_image",         // seo
])

// Récupère les clés imbriquées au format "parent.filial"
function getNestedKey(obj: Record<string, unknown>, key: string): string[] {
  const keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      keys.push(...getNestedKey(v as Record<string, unknown>, `${key}.${k}`))
    } else {
      keys.push(`${key}.${k}`)
    }
  }
  return keys
}

// GET - Récupère tous les paramètres (public : utilisé par le front-office)
export async function GET() {
  try {
    const adminClient = createAdminClient()
    const settings = await getAllSettings(adminClient)
    return NextResponse.json(settings)
  } catch (error) {
    console.error("[settings] general get error:", error)
    return NextResponse.json({ error: "Unable to load settings" }, { status: 500 })
  }
}

// POST - Sauvegarde un ou plusieurs paramètres (admin uniquement)
// Body accepté :
//  - { homepage: { ... } }       pour l'accueil
//  - { store_info: { ... } }     pour la boutique
//  - { settings: [[key, value]] } pour plusieurs paramètres
export async function POST(request: Request) {
  try {
    const serverClient = await createClient()
    const adminClient = createAdminClient()

    // Vérifier l'authentification admin
    const { data: { user } } = await serverClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: adminUser } = await serverClient.from("admin_users").select("*").eq("id", user.id).single()
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const entries: [string, unknown][] = Array.isArray(body?.settings)
      ? body.settings
      : Object.entries(body ?? {})

    if (entries.length === 0) {
      return NextResponse.json({ error: "Aucun paramètre fourni" }, { status: 400 })
    }

    for (const [key, value] of entries) {
      // Validation : la whitelist garantit que la clé est autorisée
      if (!WRITABLE_SETTING_KEYS.includes(key as keyof AllSettings)) {
        return NextResponse.json({ error: `Clé de paramètre non autorisée : ${key}` }, { status: 400 })
      }

      // Vérification spéciale pour les données binaires : refuser les dataURL
      if (typeof value === "string" && isDataUrl(value)) {
        return NextResponse.json({ error: `La valeur pour "${key}" est un dataURL. Utiliser une URL (https://...) au lieu de dataURL.` }, { status: 400 })
      }

      // Vérification des URLs uniquement sur les champs définis
      if (typeof value === "object" && value !== null) {
        const obj = value as Record<string, unknown>
        for (const subKey of getNestedKey(obj, key)) {
          // Vérifier si c'est un champ d'URL
          const parts = subKey.split(".")
          const leafKey = parts.pop()!
          if (!URL_FIELDS.has(leafKey)) continue

          let fieldValue: unknown = obj
          for (const k of parts) {
            fieldValue = (fieldValue as Record<string, unknown>)?.[k]
          }

          if (typeof fieldValue === "string" && !isValidUrl(fieldValue)) {
            return NextResponse.json(
              { error: `URL invalide pour "${subKey}" : "${fieldValue}". Utiliser https://... ou un chemin absolu.` },
              { status: 400 }
            )
          }
        }
      }

      const result = await saveSetting(adminClient, key, value)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[settings] general post error:", error)
    return NextResponse.json({ error: "Unable to save settings" }, { status: 500 })
  }
}
