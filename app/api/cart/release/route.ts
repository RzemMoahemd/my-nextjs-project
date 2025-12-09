import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { adjustInventoryQuantity, cleanupExpiredReservations } from "@/lib/inventory"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { reservation_id } = body

    if (!reservation_id) {
      return NextResponse.json({ error: "Reservation id is required" }, { status: 400 })
    }

    const adminClient = createAdminClient()
    await cleanupExpiredReservations(adminClient)

    const { data: reservation, error } = await adminClient
      .from("cart_reservations")
      .select("*")
      .eq("id", reservation_id)
      .single()

    if (error || !reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
    }

    await adjustInventoryQuantity(adminClient, reservation.product_id, reservation.size, reservation.color || 'Standard', reservation.quantity)
    await adminClient.from("cart_reservations").delete().eq("id", reservation_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[cart] release error:", error)
    return NextResponse.json({ error: "Unable to release reservation" }, { status: 500 })
  }
}

