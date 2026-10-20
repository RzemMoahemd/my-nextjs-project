import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient()

    const result = await adminClient
      .rpc("cleanup_cart_reservations")
      .single() as unknown

    const data = (result as { data: { deleted_count: number; last_deleted_at: string | null } | null }).data
    const error = (result as { error: any }).error

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to cleanup expired reservations" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      deleted_count: data.deleted_count,
      last_deleted_at: data.last_deleted_at,
    })
  } catch (error: any) {
    console.error("[cart] cleanup error:", error)
    return NextResponse.json(
      { error: "Unable to cleanup expired reservations" },
      { status: 500 }
    )
  }
}
