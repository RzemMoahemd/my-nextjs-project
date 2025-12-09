import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { adjustInventoryQuantity } from "@/lib/inventory"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const serverClient = await createClient()
    const adminClient = createAdminClient()

    console.log("[v0] PUT /api/orders/[id] - Order ID:", id)
    console.log("[v0] Request body:", body)

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

    const { status, notes } = body
    const validStatuses = ["pending", "confirmed", "delivered", "cancelled", "returned", "confirmed_delivery"]

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const { data: previousOrder, error: fetchError } = await adminClient
      .from("orders")
      .select("items,status,inventory_restored")
      .eq("id", id)
      .single()

    console.log("[v0] Previous order:", previousOrder)
    console.log("[v0] Fetch error:", fetchError)

    if (fetchError || !previousOrder) {
      console.error("[v0] Order not found or fetch error:", fetchError)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const items = Array.isArray(previousOrder.items) ? previousOrder.items : []
    let inventoryRestored = previousOrder.inventory_restored || false

    console.log("[v0] Items:", items)
    console.log("[v0] Current status:", previousOrder.status, "-> New status:", status)
    console.log("[v0] Inventory restored:", inventoryRestored)

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

    // Cas 3: Remettre en attente une commande annulée ou retournée (retirer à nouveau le stock)
    if (status === "pending" && (previousOrder.status === "cancelled" || previousOrder.status === "returned") && inventoryRestored) {
      console.log("[v0] Removing inventory for re-pending order")
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
    }

    // Cas 4: Accepter ou livrer une commande (le stock a déjà été retiré lors de la création)
    // Pas de changement d'inventaire nécessaire

    console.log("[v0] Updating order with status:", status, "inventory_restored:", inventoryRestored)

    const { data: order, error } = await adminClient
      .from("orders")
      .update({
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        inventory_restored: inventoryRestored,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    console.log("[v0] Update result - error:", error, "order:", order)

    if (error) {
      console.error("[v0] Database update error:", error)
      throw error
    }

    return NextResponse.json(order)
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
