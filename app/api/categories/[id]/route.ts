import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

// PUT - Mettre à jour une catégorie
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
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

    const { name, parent_id } = body

    const { data: category, error } = await adminClient
      .from("categories")
      .update({ name, parent_id: parent_id || null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(category)
  } catch (error) {
    console.error("[v0] Category update error:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

// DELETE - Supprimer une catégorie
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

    const { error } = await adminClient.from("categories").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ message: "Category deleted successfully" })
  } catch (error) {
    console.error("[v0] Category deletion error:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}