import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"

const SETTINGS_KEY = "delivery_fee"

export async function GET() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.from("settings").select("value").eq("key", SETTINGS_KEY).single()

    if (error) throw error

    const amount = Number(data?.value?.amount ?? 0)
    return NextResponse.json({ amount })
  } catch (error) {
    console.error("[settings] delivery fee get:", error)
    return NextResponse.json({ amount: 0 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const amount = Number(body.amount)

    if (Number.isNaN(amount) || amount < 0) {
      return NextResponse.json({ error: "Invalid fee amount" }, { status: 400 })
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
      .upsert({ key: SETTINGS_KEY, value: { amount }, updated_at: new Date().toISOString() })

    if (error) throw error

    return NextResponse.json({ amount })
  } catch (error) {
    console.error("[settings] delivery fee update:", error)
    return NextResponse.json({ error: "Unable to update delivery fee" }, { status: 500 })
  }
}

