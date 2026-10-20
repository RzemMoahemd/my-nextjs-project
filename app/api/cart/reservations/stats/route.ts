import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function GET() {
  try {
    const adminClient = createAdminClient()
    const nowIso = new Date().toISOString()
    const { data: active, error: activeError } = await adminClient.from("cart_reservations").select("id").gte("expires_at", nowIso)
    const { data: expired, error: expiredError } = await adminClient.from("cart_reservations").select("id").lt("expires_at", nowIso)
    if (activeError || expiredError) {
      return NextResponse.json({ error: "Failed to get reservation stats" }, { status: 500 })
    }
    return NextResponse.json({ active_count: active?.length ?? 0, expired_count: expired?.length ?? 0 })
  } catch (error) {
    console.error("[cart] stats error:", error)
    return NextResponse.json({ error: "Unable to get reservation stats" }, { status: 500 })
  }
}
