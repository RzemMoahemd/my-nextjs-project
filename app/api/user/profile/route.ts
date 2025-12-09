import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import type { UserProfile } from "@/lib/types"

// GET - Récupérer le profil de l'utilisateur connecté
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

    // Récupérer ou créer le profil
    const { data: profile, error } = await supabaseServer
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error("[v0] Profile fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    // Si le profil n'existe pas, en créer un vide
    let userProfile = profile as UserProfile | null
    if (!userProfile) {
      // Créer un profil vide pour l'utilisateur
      const { data: newProfile, error: insertError } = await supabaseServer
        .from("user_profiles")
        .insert([{ user_id: user.id }])
        .select("*")
        .single()

      if (insertError) {
        console.error("[v0] Profile creation error:", insertError)
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
      }

      userProfile = newProfile as UserProfile
    }

    return NextResponse.json(userProfile)
  } catch (error) {
    console.error("[v0] User profile fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PUT - Mettre à jour le profil de l'utilisateur connecté
export async function PUT(request: Request) {
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
    const {
      full_name,
      phone,
      address,
      postal_code,
      city,
      date_of_birth,
      gender,
      preferences,
    } = body

    // Validation basique
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return NextResponse.json({ error: "Invalid gender value" }, { status: 400 })
    }

    if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/\s+/g, ''))) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 })
    }

    // Données à mettre à jour
    const profileData = {
      full_name: full_name || null,
      phone: phone || null,
      address: address || null,
      postal_code: postal_code || null,
      city: city || null,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
      preferences: preferences || {},
    }

    // Upsert le profil (met à jour si il existe, insère sinon)
    const { data: profile, error } = await supabaseServer
      .from("user_profiles")
      .upsert({
        user_id: user.id,
        ...profileData,
      }, {
        onConflict: 'user_id'
      })
      .select("*")
      .single()

    if (error) {
      console.error("[v0] Profile update error:", error)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("[v0] User profile update error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
