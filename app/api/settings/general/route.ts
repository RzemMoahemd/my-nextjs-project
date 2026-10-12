import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { getAllSettings, saveSetting } from "@/lib/settings"

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
// Body attendu : { store_info: {...} } ou { settings: [[key, value], ...] }
export async function POST(request: Request) {
  try {
    const serverClient = await createClient()
    const adminClient = createAdminClient()

    // Vérifier l'authentification admin
    const {
      data: { user },
    } = await serverClient.auth.getUser()

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
      return NextResponse.json({ error: "No settings provided" }, { status: 400 })
    }

    for (const [key, value] of entries) {
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
