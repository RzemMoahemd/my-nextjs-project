import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Verify admin access
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: adminUser } = await supabase.from("admin_users").select("*").eq("id", user.id).single()

    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get stats
    const { data: products } = await supabase.from("products").select("in_stock")

    const totalProducts = products?.length || 0
    const inStockCount = products?.filter((p) => p.in_stock).length || 0
    const outOfStockCount = totalProducts - inStockCount

    return NextResponse.json({
      totalProducts,
      inStockCount,
      outOfStockCount,
    })
  } catch (error) {
    console.error("[v0] Stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
