import { createAdminClient } from "@/lib/supabase-admin"
import { NextResponse } from "next/server"

// GET - Récupérer les données nécessaires au dropdown de navigation
export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()

    // Récupérer toutes les catégories et ne garder que les racines (niveau 1, sans parent)
    const { data: allCategories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name, parent_id")
      .order("name")

    if (categoriesError) {
      console.error("[v0] Categories fetch error:", categoriesError)
    }

    const categories = (allCategories || []).filter(
      (c) => c.parent_id === null || c.parent_id === undefined
    )

    // Récupérer les 3 derniers produits ajoutés (actifs uniquement)
    const { data: recentProducts, error: productsError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        price,
        promotional_price,
        images,
        category,
        badge,
        created_at
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(3)

    if (productsError) {
      console.error("[v0] Recent products fetch error:", productsError)
    }

    return NextResponse.json({
      categories: categories || [],
      recentProducts: recentProducts || []
    })

  } catch (error) {
    console.error("[v0] Navigation data fetch error:", error)
    return NextResponse.json({
      categories: [],
      recentProducts: []
    })
  }
}
