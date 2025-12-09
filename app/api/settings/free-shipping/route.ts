import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"

const SETTINGS_KEY = "free_shipping"

export async function GET() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.from("settings").select("value").eq("key", SETTINGS_KEY).single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    const threshold = Number(data?.value?.threshold ?? 140)
    const enabled = Boolean(data?.value?.enabled ?? true)
    
    return NextResponse.json({ threshold, enabled })
  } catch (error) {
    console.error("[settings] free shipping get:", error)
    return NextResponse.json({ threshold: 140, enabled: true })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const threshold = Number(body.threshold)
    const enabled = Boolean(body.enabled)

    if (Number.isNaN(threshold) || threshold < 0) {
      return NextResponse.json({ error: "Invalid threshold amount" }, { status: 400 })
    }

    const serverClient = await createClient()
    const adminClient = createAdminClient()

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

    const { error } = await adminClient
      .from("settings")
      .upsert({ key: SETTINGS_KEY, value: { threshold, enabled }, updated_at: new Date().toISOString() })

    if (error) throw error

    return NextResponse.json({ threshold, enabled })
  } catch (error) {
    console.error("[settings] free shipping update:", error)
    return NextResponse.json({ error: "Unable to update free shipping settings" }, { status: 500 })
  }
}