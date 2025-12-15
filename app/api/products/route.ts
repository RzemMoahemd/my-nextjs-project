import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Utiliser les nouvelles colonnes avec jointures pour récupérer les noms
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        category:categories!category_id(name),
        subcategory:categories!subcategory_id(name),
        subsubcategory:categories!subsubcategory_id(name)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Transformer les données pour maintenir la compatibilité avec l'ancien format
    const transformedData = data?.map(product => ({
      ...product,
      // Garder l'ancien champ 'category' pour compatibilité temporaire
      category: product.category?.name || product.category,
      // Transformer les objets de jointure en arrays pour subcategory
      subcategory: product.subcategory ? [product.subcategory.name] : product.subcategory || [],
      // Transformer les objets de jointure en strings pour subsubcategory
      subsubcategory: product.subsubcategory?.name || product.subsubcategory || null
    })) || []

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error("[v0] Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
