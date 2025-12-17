import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { adjustInventoryQuantity } from "@/lib/inventory"

// Structure centralisée des transitions de statuts autorisées
// SOURCE UNIQUE DE VÉRITÉ pour toutes les règles de transition
function getAllowedTransitions(currentStatus: string, orderData?: any): string[] {
  // Statuts finaux absolus (aucune transition possible)
  const FINAL_STATUSES = ['returned', 'confirmed_delivery']

  // Statuts finaux conditionnels (exceptions temporelles possibles)
  const CONDITIONAL_FINAL_STATUSES = ['cancelled'] // UNDO possible dans délai

  // Transitions normales (workflow métier standard)
  const NORMAL_TRANSITIONS: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["in_delivery", "cancelled"],
    in_delivery: ["delivered", "delivery_failed"],
    delivered: ["confirmed_delivery", "returned"],
    delivery_failed: ["returned"],
  }

  // 1. Statuts finaux absolus = aucune transition possible
  if (FINAL_STATUSES.includes(currentStatus)) {
    return []
  }

  // 2. Statuts finaux conditionnels = exceptions temporelles possibles
  if (CONDITIONAL_FINAL_STATUSES.includes(currentStatus)) {
    // UNDO pour cancelled = exception temporelle
    if (currentStatus === "cancelled") {
      // Vérifier les conditions d'UNDO (exception temporelle)
      if (orderData?.can_undo_cancel && orderData?.cancelled_at) {
        const cancelledTime = new Date(orderData.cancelled_at).getTime()
        const currentTime = new Date().getTime()
        const gracePeriodMs = 5 * 60 * 1000 // 5 minutes

        // UNDO autorisé dans le délai (exception temporelle)
        if ((currentTime - cancelledTime) <= gracePeriodMs) {
          return ["pending"]
        }
      }
      // Délai expiré = statut final
      return []
    }

    // Autres statuts conditionnels (si ajoutés plus tard)
    return []
  }

  // 3. Transitions normales du workflow métier
  return NORMAL_TRANSITIONS[currentStatus] || []
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const serverClient = await createClient()
    const adminClient = createAdminClient()

    console.log("[v0] PUT /api/orders/[id] - Order ID:", id)
    console.log("[v0] Request body:", body)

    try {
      const {
        data: { user },
      } = await serverClient.auth.getUser()

      if (!user) {
        console.log("[v0] No authenticated user")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const { data: adminUser } = await serverClient.from("admin_users").select("*").eq("id", user.id).single()

      if (!adminUser) {
        console.log("[v0] User is not admin")
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } catch (authError) {
      console.error("[v0] Auth error:", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    const { status, notes, cancelled_at, can_undo_cancel } = body
    const validStatuses = ["pending", "confirmed", "preparing", "in_delivery", "delivered", "delivery_failed", "cancelled", "returned", "confirmed_delivery"]

    // Récupérer la commande actuelle pour validation
    const { data: previousOrder, error: fetchError } = await adminClient
      .from("orders")
      .select("items,status,inventory_restored,cancelled_at,can_undo_cancel,previous_status")
      .eq("id", id)
      .single()

    console.log("[v0] Previous order:", previousOrder)
    console.log("[v0] Fetch error:", fetchError)

    if (fetchError || !previousOrder) {
      console.error("[v0] Order not found or fetch error:", fetchError)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Forcer la mise à jour des métadonnées UNDO lors d'une annulation
    let finalCancelledAt = cancelled_at
    let finalCanUndoCancel = can_undo_cancel
    let finalPreviousStatus = previousOrder.previous_status // Garder la valeur existante par défaut

    if (status === "cancelled") {
      finalCancelledAt = new Date().toISOString()
      finalCanUndoCancel = true
      finalPreviousStatus = previousOrder.status // Sauvegarder le statut actuel avant annulation
    }

    // Valider les transitions de statut si un statut est fourni
    if (status) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 })
      }

      // Vérifier que la transition est autorisée (previousOrder est déjà récupéré ci-dessus)
      const allowedTransitions = getAllowedTransitions(previousOrder.status, previousOrder)
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json({
          error: `Transition non autorisée: ${previousOrder.status} → ${status}`
        }, { status: 400 })
      }
    }

    const items = Array.isArray(previousOrder.items) ? previousOrder.items : []
    let inventoryRestored = previousOrder.inventory_restored || false

    console.log("[v0] Items:", items)
    console.log("[v0] Current status:", previousOrder.status, "-> New status:", status)
    console.log("[v0] Inventory restored:", inventoryRestored)

    // Initialiser updateData au début pour éviter les erreurs de portée
    let updateData: any = {
      inventory_restored: inventoryRestored,
      updated_at: new Date().toISOString(),
    }

    // Cas 3: UNDO temporaire d'annulation (remettre au statut précédent)
    // Maintenant géré automatiquement par getAllowedTransitions() + logique d'inventaire
    if (status === "pending" && previousOrder.status === "cancelled") {
      // UNDO autorisé (validation déjà faite par getAllowedTransitions)
      // Utiliser le statut précédent sauvegardé lors de l'annulation
      const actualTargetStatus = previousOrder.previous_status || "pending"

      console.log("[v0] UNDO: restoring to previous status:", actualTargetStatus)

      // Forcer le statut cible pour l'UNDO
      updateData.status = actualTargetStatus
      console.log("[v0] UNDO: changed target status to:", actualTargetStatus)

      // Remettre le stock en réserve si nécessaire
      if (inventoryRestored) {
        console.log("[v0] UNDO cancellation - removing inventory")
        for (const item of items) {
          if (item.product_id && item.size && item.quantity) {
            const color = item.color || 'Standard'
            console.log("[v0] Adjusting inventory:", item.product_id, item.size, color, "-", item.quantity)
            try {
              await adjustInventoryQuantity(adminClient, item.product_id, item.size, color, -item.quantity)
            } catch (inventoryError) {
              console.error("[v0] Inventory adjustment failed:", inventoryError)
              // Continue with other items but don't fail the entire operation
            }
          }
        }
        inventoryRestored = false
        updateData.inventory_restored = inventoryRestored
      }

      // Nettoyer automatiquement les métadonnées UNDO lors d'un UNDO réussi
      finalCanUndoCancel = false
      finalCancelledAt = null
      finalPreviousStatus = null // Nettoyer aussi le previous_status après utilisation
      console.log("[v0] UNDO successful - cleaning up metadata")
    }

    // Logique de gestion d'inventaire
    // Cas 1: Annulation d'une commande (et inventaire pas encore restauré)
    if (status === "cancelled" && previousOrder.status !== "cancelled" && previousOrder.status !== "returned" && !inventoryRestored) {
      console.log("[v0] Restoring inventory for cancellation")
      for (const item of items) {
        if (item.product_id && item.size && item.quantity) {
          const color = item.color || 'Standard'
          console.log("[v0] Adjusting inventory:", item.product_id, item.size, color, "+", item.quantity)
          try {
            await adjustInventoryQuantity(adminClient, item.product_id, item.size, color, item.quantity)
          } catch (inventoryError) {
            console.error("[v0] Inventory adjustment failed:", inventoryError)
            // Continue with other items but don't fail the entire operation
          }
        }
      }
      inventoryRestored = true
    }
    
    // Cas 2: Retour de livraison (restaurer l'inventaire)
    // On restaure l'inventaire seulement si la commande vient d'un statut où le stock était réservé
    if (status === "returned" && previousOrder.status !== "cancelled" && previousOrder.status !== "returned" && !inventoryRestored) {
      console.log("[v0] Restoring inventory for return")
      for (const item of items) {
        if (item.product_id && item.size && item.quantity) {
          const color = item.color || 'Standard'
          console.log("[v0] Adjusting inventory:", item.product_id, item.size, color, "+", item.quantity)
          try {
            await adjustInventoryQuantity(adminClient, item.product_id, item.size, color, item.quantity)
          } catch (inventoryError) {
            console.error("[v0] Inventory adjustment failed:", inventoryError)
            // Continue with other items but don't fail the entire operation
          }
        }
      }
      inventoryRestored = true
    }



    // Cas 4: Finaliser les données de mise à jour
    // Ne pas écraser le statut s'il a été défini dans la logique UNDO
    console.log("[v0] Updating order with status:", status, "inventory_restored:", inventoryRestored)

    // Pour l'UNDO, le statut a déjà été défini plus haut, ne pas l'écraser
    const isUndoOperation = status === "pending" && previousOrder.status === "cancelled"
    if (status && !isUndoOperation) {
      updateData.status = status
    }

    if (notes !== undefined) updateData.notes = notes
    if (finalCancelledAt !== undefined) updateData.cancelled_at = finalCancelledAt
    if (finalCanUndoCancel !== undefined) updateData.can_undo_cancel = finalCanUndoCancel
    if (finalPreviousStatus !== undefined) updateData.previous_status = finalPreviousStatus

    console.log("[v0] Update data:", updateData)
    console.log("[v0] Order ID to update:", id)

    // Vérifier que l'ID est un UUID valide
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      console.error("[v0] Invalid UUID format:", id)
      return NextResponse.json({ error: "Invalid order ID format" }, { status: 400 })
    }

    const { error } = await adminClient
      .from("orders")
      .update(updateData)
      .eq("id", id)

    console.log("[v0] Update result - error:", JSON.stringify(error, null, 2))

    if (error) {
      console.error("[v0] Database update error:", error)
      console.error("[v0] Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })

      // Retourner une erreur plus détaillée pour le debugging
      return NextResponse.json({
        error: "Database update failed",
        details: error.message,
        code: error.code,
        hint: error.hint,
        updateData: updateData,
        orderId: id
      }, { status: 500 })
    }

    // Mise à jour réussie - retourner succès simple
    console.log("[v0] Order update successful")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Order update error:", error)
    return NextResponse.json({ error: "Failed to update order", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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

    // Récupérer la commande avant suppression pour gérer l'inventaire
    const { data: order, error: fetchError } = await adminClient
      .from("orders")
      .select("items,status,inventory_restored")
      .eq("id", id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Si la commande n'est pas annulée et l'inventaire n'a pas été restauré, le restaurer
    if (order.status !== "cancelled" && !order.inventory_restored) {
      const items = Array.isArray(order.items) ? order.items : []
      for (const item of items) {
        if (item.product_id && item.size && item.quantity) {
          const color = item.color || 'Standard'
          try {
            await adjustInventoryQuantity(adminClient, item.product_id, item.size, color, item.quantity)
          } catch (inventoryError) {
            console.error("[v0] Inventory adjustment failed on delete:", inventoryError)
            // Continue with other items but don't fail the entire operation
          }
        }
      }
    }

    const { error } = await adminClient.from("orders").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ message: "Order deleted successfully" })
  } catch (error) {
    console.error("[v0] Order deletion error:", error)
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 })
  }
}
