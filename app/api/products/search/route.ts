import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    const supabase = await createClient()

    let queryBuilder = supabase.from("products").select("*").order("created_at", { ascending: false }).limit(limit)

    if (query) {
      queryBuilder = queryBuilder.ilike("name", `%${query}%`)
    }

    const { data, error } = await queryBuilder

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("[v0] Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
