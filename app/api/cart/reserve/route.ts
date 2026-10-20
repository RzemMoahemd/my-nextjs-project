import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { cleanupExpiredReservations, getReservationDurationMs, getReservationDurationMsCached } from "@/lib/inventory"
import { getAllSettings } from "@/lib/settings"

// Simple cache in-memory (single Node process); not for distributed workers
let cachedDurationMs: number = 15

async function getEffectiveReservationDurationMs(): Promise<number> {
  if (cachedDurationMs !== 15) return cachedDurationMs

  const adminClient = createAdminClient()
  const allSettings = await getAllSettings(adminClient)
  cachedDurationMs = await getReservationDurationMs(allSettings)
  return cachedDurationMs
}

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

    // Durée de réservation configurable (0 = désactivée, cette réservation n'est pas réservée, stock immédiat)
    const reservationDurationMs = await getEffectiveReservationDurationMs()
    const expiresAt = reservationDurationMs > 0
      ? new Date(Date.now() + reservationDurationMs).toISOString()
      : null

    await cleanupExpiredReservations(adminClient)

    if (!reservation_id) {
      if (quantity <= 0) {
        return NextResponse.json({ error: "Quantity must be greater than zero" }, { status: 400 })
      }

      // T05 : Réservation atomique (stock + insertion réservation dans une transaction)
      const { data, error } = await adminClient
        .rpc("reserve_cart_item", {
          p_cart_id: cart_id,
          p_product_id: product_id,
          p_size: size,
          p_color: variantColor,
          p_quantity: quantity,
          p_expires_at: expiresAt,
        })
        .single() as { data: { reservation_id: string; success: boolean; error_message: string | null } | null; error: any }

      if (error || !data?.success) {
        throw new Error(data?.error_message ?? "Failed to create reservation")
      }

      return NextResponse.json(
        {
          reservation_id: data.reservation_id,
          quantity,
          expires_at: expiresAt,
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
      // T05 : Libération atomique (restauration stock + suppression réservation dans une transaction)
      const { data: releaseData, error: releaseError } = await adminClient
        .rpc("release_cart_reservation", {
          p_reservation_id: reservation_id,
        })
        .single() as { data: { success: boolean; error_message: string | null } | null; error: any }

      if (releaseError || !releaseData?.success) {
        throw new Error(releaseData?.error_message ?? "Failed to release reservation")
      }

      return NextResponse.json({
        reservation_id,
        quantity: 0,
        expires_at: null,
      })
    }

    const delta = quantity - currentReservation.quantity
    if (delta !== 0) {
      // T05 : Mise à jour atomique (stock + mise à jour réservation dans une transaction)
      const { data: updateData, error: updateError } = await adminClient
        .rpc("update_cart_reservation_quantity", {
          p_reservation_id: reservation_id,
          p_new_quantity: quantity,
          p_expires_at: expiresAt,
        })
        .single() as { data: { success: boolean; error_message: string | null } | null; error: any }

      if (updateError || !updateData?.success) {
        throw new Error(updateData?.error_message ?? "Failed to update reservation")
      }

      return NextResponse.json({
        reservation_id,
        quantity,
        expires_at: expiresAt,
      })
    }

    // Pas de changement de quantité, juste mettre à jour l'expiration
    const { data: updated, error: updateError } = await adminClient
      .from("cart_reservations")
      .update({
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

