import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

// GET - Récupérer toutes les catégories avec comptage produits
export async function GET() {
  try {
    const adminClient = createAdminClient()
    const { data: categories, error } = await adminClient
      .from("categories")
      .select("*")
      .order("name", { ascending: true })

    if (error) throw error

    // Ajouter le comptage récursif des produits pour chaque catégorie
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        let totalCount = 0

        // Compter les produits directs dans cette catégorie
        const { count: directCount, error: directError } = await adminClient
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("category_id", category.id)

        if (directError) {
          console.error("Error counting direct products for category", category.id, directError)
        } else {
          totalCount += directCount || 0
        }

        // Compter les produits dans les sous-catégories (niveau 2)
        const { count: subcategoryCount, error: subError } = await adminClient
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("subcategory_id", category.id)

        if (subError) {
          console.error("Error counting subcategory products for category", category.id, subError)
        } else {
          totalCount += subcategoryCount || 0
        }

        // Compter les produits dans les sous-sous-catégories (niveau 3)
        const { count: subsubcategoryCount, error: subsubError } = await adminClient
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("subsubcategory_id", category.id)

        if (subsubError) {
          console.error("Error counting subsubcategory products for category", category.id, subsubError)
        } else {
          totalCount += subsubcategoryCount || 0
        }

        return {
          ...category,
          product_count: totalCount
        }
      })
    )

    return NextResponse.json(categoriesWithCounts || [])
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
