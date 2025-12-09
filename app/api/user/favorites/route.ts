import { createClient } from "@/lib/supabase-server"
import { createClientComponentClient } from "@/lib/supabase-client"
import { NextResponse } from "next/server"

// GET - Récupérer les favoris de l'utilisateur
export async function GET(request: Request) {
  try {
    const supabaseServer = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Vérifier si la table favorites existe
    const { error: tableCheckError } = await supabaseServer
      .from('favorites')
      .select('count', { count: 'exact', head: true })

    if (tableCheckError && tableCheckError.code === 'PGRST116') {
      // Table n'existe pas - fonctionnement normal, pas d'erreur
      console.info("[v0] Table favorites not configured yet")
      return NextResponse.json([])
    }

    // Récupérer les favoris de l'utilisateur
    const { data: favorites, error } = await supabaseServer
      .from('favorites')
      .select('product_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("[v0] Favorites query error:", error)
      throw error
    }

    return NextResponse.json(favorites || [])
  } catch (error) {
    console.error("[v0] User favorites fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 })
  }
}

// POST - Ajouter ou retirer un favori
export async function POST(request: Request) {
  try {
    const supabaseServer = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { productId, action } = body

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    if (action === 'add') {
      // Ajouter aux favoris
      const { error } = await supabaseServer
        .from('favorites')
        .insert({
          user_id: user.id,
          product_id: productId
        })

      if (error) {
        console.error("[v0] Add favorite error:", error)
        throw error
      }

      return NextResponse.json({ success: true, action: 'added' })

    } else if (action === 'remove') {
      // Retirer des favoris
      const { error } = await supabaseServer
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)

      if (error) {
        console.error("[v0] Remove favorite error:", error)
        throw error
      }

      return NextResponse.json({ success: true, action: 'removed' })
    } else if (action === 'toggle') {
      // Basculement : ajouter si pas présent, retirer si présent
      const { data: existingFavorite, error: checkError } = await supabaseServer
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle()

      if (checkError) {
        console.error("[v0] Check favorite error:", checkError)
        throw checkError
      }

      if (existingFavorite) {
        // Retirer
        const { error: deleteError } = await supabaseServer
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId)

        if (deleteError) throw deleteError

        return NextResponse.json({ success: true, action: 'removed', isFavorite: false })
      } else {
        // Ajouter
        const { error: insertError } = await supabaseServer
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: productId
          })

        if (insertError) throw insertError

        return NextResponse.json({ success: true, action: 'added', isFavorite: true })
      }
    }

    return NextResponse.json({ error: "Invalid action. Use 'add', 'remove', or 'toggle'" }, { status: 400 })

  } catch (error) {
    console.error("[v0] Favorites management error:", error)
    // Afficher plus de détails pour le debugging
    const err = error as any
    console.error("[v0] Full error details:", {
      message: err?.message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint
    })
    return NextResponse.json({ error: "Failed to manage favorite" }, { status: 500 })
  }
}
