import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

// GET - Récupérer les données nécessaires au dropdown de navigation
export async function GET(request: Request) {
  try {
    const serverClient = await createClient()

    // Récupérer toutes les catégories pour le dropdown de navigation
    const { data: categories, error: categoriesError } = await serverClient
      .from("categories")
      .select("id, name, parent_id")
      .order("name")
      .limit(10) // Limite pour éviter trop de catégories

    if (categoriesError) {
      console.error("[v0] Categories fetch error:", categoriesError)
    }

    // Récupérer les 3 derniers produits ajoutés (actifs uniquement)
    const { data: recentProducts, error: productsError } = await serverClient
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
