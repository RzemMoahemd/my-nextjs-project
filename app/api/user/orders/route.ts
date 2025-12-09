import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

// GET - Récupérer les commandes de l'utilisateur connecté
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

    // Récupérer les commandes de l'utilisateur connecté
    const { data: orders, error } = await supabaseServer
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("[v0] User orders query error:", error)
      throw error
    }

    return NextResponse.json(orders || [])
  } catch (error) {
    console.error("[v0] User orders fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
