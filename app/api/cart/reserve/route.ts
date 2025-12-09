import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { adjustInventoryQuantity, cleanupExpiredReservations } from "@/lib/inventory"

const RESERVATION_DURATION_MS = 15 * 60 * 1000

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { cart_id, product_id, size, color, quantity, reservation_id } = body

    if (!cart_id || !product_id || !size || typeof quantity !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Utiliser 'Standard' comme couleur par défaut si non fournie
    const variantColor = color || 'Standard'

    const adminClient = createAdminClient()
    await cleanupExpiredReservations(adminClient)

    const expiresAt = new Date(Date.now() + RESERVATION_DURATION_MS).toISOString()

    if (!reservation_id) {
      if (quantity <= 0) {
        return NextResponse.json({ error: "Quantity must be greater than zero" }, { status: 400 })
      }

      await adjustInventoryQuantity(adminClient, product_id, size, variantColor, -quantity)

      const { data, error } = await adminClient
        .from("cart_reservations")
        .insert([
          {
            cart_id,
            product_id,
            size,
            color: variantColor,
            quantity,
            expires_at: expiresAt,
          },
        ])
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error("Failed to create reservation")
      }

      return NextResponse.json(
        {
          reservation_id: data.id,
          quantity: data.quantity,
          expires_at: data.expires_at,
        },
        { status: 201 },
      )
    }

    const { data: currentReservation, error: fetchError } = await adminClient
      .from("cart_reservations")
      .select("*")
      .eq("id", reservation_id)
      .single()

    if (fetchError || !currentReservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
    }

    if (quantity <= 0) {
      await adjustInventoryQuantity(adminClient, product_id, size, currentReservation.color || 'Standard', currentReservation.quantity)
      await adminClient.from("cart_reservations").delete().eq("id", reservation_id)

      return NextResponse.json({
        reservation_id,
        quantity: 0,
        expires_at: null,
      })
    }

    const delta = quantity - currentReservation.quantity
    if (delta !== 0) {
      await adjustInventoryQuantity(adminClient, product_id, size, currentReservation.color || 'Standard', -delta)
    }

    const { data: updated, error: updateError } = await adminClient
      .from("cart_reservations")
      .update({
        quantity,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservation_id)
      .select()
      .single()

    if (updateError || !updated) {
      throw updateError ?? new Error("Failed to update reservation")
    }

    return NextResponse.json({
      reservation_id,
      quantity: updated.quantity,
      expires_at: updated.expires_at,
    })
  } catch (error: any) {
    console.error("[cart] reserve error:", error)
    if (error?.message?.includes("insufficient") || error?.message?.includes("stock")) {
      return NextResponse.json({ error: "INSUFFICIENT_STOCK" }, { status: 400 })
    }
    return NextResponse.json({ error: "Unable to reserve product" }, { status: 500 })
  }
}

