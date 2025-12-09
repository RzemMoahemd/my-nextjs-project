import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

// GET - Récupérer les notifications de stock faible
export async function GET() {
  try {
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

    const { data: notifications, error } = await adminClient
      .from("low_stock_notifications")
      .select("*")
      .eq("is_resolved", false)
      .order("notified_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(notifications || [])
  } catch (error) {
    console.error("[v0] Low stock notifications fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

// POST - Marquer une notification comme résolue
export async function POST(request: Request) {
  try {
    const body = await request.json()
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

    const { notification_id } = body

    const { error } = await adminClient
      .from("low_stock_notifications")
      .update({ is_resolved: true })
      .eq("id", notification_id)

    if (error) throw error

    return NextResponse.json({ message: "Notification resolved" })
  } catch (error) {
    console.error("[v0] Notification resolve error:", error)
    return NextResponse.json({ error: "Failed to resolve notification" }, { status: 500 })
  }
}