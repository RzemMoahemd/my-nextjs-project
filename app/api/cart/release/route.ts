import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { cleanupExpiredReservations } from "@/lib/inventory"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { reservation_id } = body

    if (!reservation_id) {
      return NextResponse.json({ error: "Reservation id is required" }, { status: 400 })
    }

    const adminClient = createAdminClient()
    await cleanupExpiredReservations(adminClient)

    const { data: reservation, error: fetchError } = await adminClient
      .from("cart_reservations")
      .select("*")
      .eq("id", reservation_id)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
    }

    // T05 : Libération atomique (restauration stock + suppression réservation dans une transaction)
    const { data, error } = await adminClient
      .rpc("release_cart_reservation", {
        p_reservation_id: reservation_id,
      })
      .single() as { data: { success: boolean; error_message: string | null } | null; error: any }

    if (error || !data?.success) {
      throw new Error(data?.error_message ?? "Failed to release reservation")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[cart] release error:", error)
    return NextResponse.json({ error: "Unable to release reservation" }, { status: 500 })
  }
}

