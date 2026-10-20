import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function GET() {
  try {
    const adminClient = createAdminClient()

    // Compter les réservations actives et expirées
    const activeResult = await adminClient
      .from("cart_reservations")
      .select("expires_at")
      .gte("expires_at", new Date().toISOString())
      .single() as unknown

    const active = (activeResult as { data: any[] | null }).data ?? []
    const activeError = (activeResult as { error: any }).error

    const expiredResult = await adminClient
      .from("cart_reservations")
      .select("expires_at")
      .lt("expires_at", new Date().toISOString())
      .single() as unknown

    const expired = (expiredResult as { data: any[] | null }).data ?? []
    const expiredError = (expiredResult as { error: any }).error

    if (activeError || expiredError) {
      return NextResponse.json(
        { error: "Failed to get reservation stats" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      active_count: active.length,
      expired_count: expired.length,
    })
  } catch (error) {
    console.error("[cart] stats error:", error)
    return NextResponse.json(
      { error: "Unable to get reservation stats" },
      { status: 500 }
    )
  }
}
