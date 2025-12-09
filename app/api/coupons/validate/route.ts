import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import type { Coupon } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, subtotal = 0 } = body

    if (!code) {
      return NextResponse.json(
        { message: 'Code promo requis' },
        { status: 400 }
      )
    }

    // Récupérer le coupon
    const supabaseAdmin = createAdminClient()
    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle()

    if (error || !coupon) {
      return NextResponse.json(
        { message: 'Code promo invalide' },
        { status: 400 }
      )
    }

    const couponTyped = coupon as Coupon

    // Vérifier la date d'expiration
    if (couponTyped.expiration_date && new Date(couponTyped.expiration_date) < new Date()) {
      return NextResponse.json(
        { message: 'Ce code promo a expiré' },
        { status: 400 }
      )
    }

    // Vérifier le nombre maximum d'utilisations
    if (couponTyped.max_uses && couponTyped.current_uses >= couponTyped.max_uses) {
      return NextResponse.json(
        { message: 'Ce code promo a atteint sa limite d\'utilisation' },
        { status: 400 }
      )
    }

    // Vérifier le montant minimum de commande
    if (subtotal < couponTyped.minimum_order) {
      return NextResponse.json(
        { message: `Montant minimum requis: ${couponTyped.minimum_order}€` },
        { status: 400 }
      )
    }

    // Pour les coupons avec produits/catégories spécifiques, on pourrait valider ici
    // mais pour simplifier, on les accepte tous dans cette implémentation

    return NextResponse.json({
      success: true,
      coupon: couponTyped
    })

  } catch (error) {
    console.error('Erreur lors de la validation du coupon:', error)
    return NextResponse.json(
      { message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
