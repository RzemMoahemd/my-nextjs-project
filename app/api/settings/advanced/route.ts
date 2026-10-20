import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { saveSetting, getAllSettings, WRITABLE_SETTING_KEYS, type AllSettings, type StoreInfo } from "@/lib/settings"

// Clés spécifiques aux "settings avancés"
const ADVANCED_SETTING_KEYS = [
  "reservation_duration_minutes",
]

// GET - Récupère les settings avancés
export async function GET() {
  try {
    const adminClient = createAdminClient()
    const allSettings = await getAllSettings(adminClient)

    // Retourne uniquement les clés avancées
    const advanced: Record<string, unknown> = {}
    for (const key of ADVANCED_SETTING_KEYS) {
      if (key in allSettings) {
        const settingsAsRecord = allSettings as unknown as Record<string, unknown>
        advanced[key] = settingsAsRecord[key]
      }
    }

    return NextResponse.json(advanced)
  } catch (error) {
    console.error("[settings] advanced get error:", error)
    return NextResponse.json({ error: "Unable to load advanced settings" }, { status: 500 })
  }
}

// POST - Sauvegarde les settings avancés
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
    const changes = body ?? {}

    // Validation : uniquement les clés autorisées
    for (const key of Object.keys(changes)) {
      if (!WRITABLE_SETTING_KEYS.includes(key as keyof AllSettings)) {
        return NextResponse.json(
          { error: `Clé de paramètre non autorisée : ${key}` },
          { status: 400 }
        )
      }
    }

    // Validation : reservation_duration_minutes
    if (typeof changes.reservation_duration_minutes === "number") {
      const duration = changes.reservation_duration_minutes
      if (duration < 0 || duration > 1440) {
        return NextResponse.json(
          { error: "La durée de réservation doit être entre 0 et 1440 minutes" },
          { status: 400 }
        )
      }
      // 0 = désactiver la réservation (stock immédiat)
    }

    // Sauvegarde des paramètres
    const entries = Object.entries(changes) as [keyof AllSettings, unknown][]
    for (const [key, value] of entries) {
      if (key === "store_info" && typeof value === "object" && value !== null) {
        // Vérifier l'URL pour les URL stockées dans store_info
        const info = value as Record<string, unknown>
        const urlFields = ["logo_url", "favicon_url"] as const
        for (const field of urlFields) {
          if (typeof info[field] === "string" && info[field] !== "") {
            try {
              const url = new URL(info[field].toString())
              if (url.protocol !== "http:" && url.protocol !== "https:") {
                return NextResponse.json(
                  { error: `URL invalide pour store_info.${field}` },
                  { status: 400 }
                )
              }
            } catch {
              return NextResponse.json(
                { error: `URL invalide pour store_info.${field}` },
                { status: 400 }
              )
            }
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
    console.error("[settings] advanced post error:", error)
    return NextResponse.json({ error: "Unable to save advanced settings" }, { status: 500 })
  }
}
