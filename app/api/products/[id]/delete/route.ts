import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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

    // Get product to find images
    const { data: product } = await adminClient.from("products").select("images").eq("id", id).single()

    // Delete images from storage
    if (product?.images?.length) {
      for (const imageUrl of product.images) {
        const filename = imageUrl.split("/").pop()
        if (filename) {
          await adminClient.storage.from("products").remove([`${id}/${filename}`])
        }
      }
    }

    // Delete product
    const { error } = await adminClient.from("products").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete error:", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
