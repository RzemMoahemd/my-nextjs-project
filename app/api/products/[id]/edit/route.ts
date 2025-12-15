import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const serverClient = await createClient()
    const adminClient = createAdminClient()

    // Verify admin access
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

    // Convert category names to IDs for the new foreign key structure
    let categoryId = null
    let subcategoryId = null
    let subsubcategoryId = null

    if (body.category) {
      const { data: categoryData } = await adminClient
        .from("categories")
        .select("id")
        .eq("name", body.category)
        .single()
      categoryId = categoryData?.id || null
    }

    if (body.subcategory) {
      const { data: subcategoryData } = await adminClient
        .from("categories")
        .select("id")
        .eq("name", body.subcategory)
        .single()
      subcategoryId = subcategoryData?.id || null
    }

    if (body.subsubcategory) {
      const { data: subsubcategoryData } = await adminClient
        .from("categories")
        .select("id")
        .eq("name", body.subsubcategory)
        .single()
      subsubcategoryId = subsubcategoryData?.id || null
    }

    // Update product with both old and new column formats for compatibility
    const { data, error } = await adminClient
      .from("products")
      .update({
        ...body,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        subsubcategory_id: subsubcategoryId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Update error:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}
