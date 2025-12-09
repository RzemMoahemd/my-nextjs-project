import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

// GET - Récupérer toutes les catégories
export async function GET() {
  try {
    const adminClient = createAdminClient()
    const { data: categories, error } = await adminClient
      .from("categories")
      .select("*")
      .order("name", { ascending: true })

    if (error) throw error

    return NextResponse.json(categories || [])
  } catch (error) {
    console.error("[v0] Categories fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

// POST - Créer une catégorie
export async function POST(request: Request) {
  try {
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

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const { data: category, error } = await adminClient
      .from("categories")
      .insert([{ name, parent_id: parent_id || null }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error("[v0] Category creation error:", error)
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}