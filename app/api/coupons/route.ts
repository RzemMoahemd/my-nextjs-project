import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import type { Coupon } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase.from("admin_users").select("*").eq("id", user.id).single()

    if (adminError || !adminUser) {
      return NextResponse.json({ message: "Accès interdit" }, { status: 403 })
    }

    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { message: `Erreur SQL: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(coupons)

  } catch (error: any) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { message: `Erreur serveur: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Vérifier les permissions admin
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase.from("admin_users").select("*").eq("id", user.id).single()

    if (adminError || !adminUser) {
      return NextResponse.json({ message: "Accès interdit" }, { status: 403 })
    }

    const body = await request.json()
    const {
      code,
      type,
      value,
      expiration_date,
      max_uses,
      applicable_products,
      applicable_categories,
      minimum_order = 0,
      description
    } = body

    // Validation des données
    if (!code || !type) {
      return NextResponse.json(
        { message: 'Code et type de coupon requis' },
        { status: 400 }
      )
    }

    if (!['percentage', 'fixed', 'free_shipping'].includes(type)) {
      return NextResponse.json(
        { message: 'Type de coupon invalide' },
        { status: 400 }
      )
    }

    if ((type === 'percentage' || type === 'fixed') && (value === undefined || value === null)) {
      return NextResponse.json(
        { message: 'Valeur requise pour ce type de coupon' },
        { status: 400 }
      )
    }

    // Vérifier si le code existe déjà
    const { data: existingCoupon, error: duplicateError } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', code.toUpperCase())
      .maybeSingle()

    if (existingCoupon) {
      return NextResponse.json(
        { message: 'Ce code promo existe déjà' },
        { status: 400 }
      )
    }

    // Créer le coupon
    const { data: coupon, error } = await supabase
      .from('coupons')
      .insert({
        code: code.toUpperCase(),
        type,
        value: (type === 'percentage' || type === 'fixed') ? parseFloat(value.toString()) : null,
        expiration_date: expiration_date ? new Date(expiration_date).toISOString() : null,
        max_uses: max_uses ? parseInt(max_uses.toString()) : null,
        applicable_products: applicable_products || null,
        applicable_categories: applicable_categories || null,
        minimum_order: parseFloat(minimum_order.toString()) || 0,
        description: description || null
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création coupon:', error)
      return NextResponse.json(
        { message: 'Erreur lors de la création du coupon' },
        { status: 500 }
      )
    }

    return NextResponse.json(coupon, { status: 201 })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
