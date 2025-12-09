import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase.from("admin_users").select("*").eq("id", user.id).single()

    if (adminError || !adminUser) {
      return NextResponse.json({ message: "Accès interdit" }, { status: 403 })
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !coupon) {
      return NextResponse.json(
        { message: 'Coupon non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(coupon)

  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Vérifier les permissions admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 })
    }

    const { data: adminUser } = await supabase.from("admin_users").select("*").eq("id", user.id).single()
    if (!adminUser) {
      return NextResponse.json({ message: "Accès interdit" }, { status: 403 })
    }

    const couponId = id

    // Vérifier si le coupon existe
    const { data: coupon, error: fetchError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .single()

    if (fetchError || !coupon) {
      return NextResponse.json(
        { message: 'Coupon non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer le coupon (les usages seront supprimés automatiquement par la contrainte ON DELETE CASCADE)
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', couponId)

    if (error) {
      console.error('Erreur suppression coupon:', error)
      return NextResponse.json(
        { message: 'Erreur lors de la suppression' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Coupon supprimé' })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase.from("admin_users").select("*").eq("id", user.id).single()

    if (adminError || !adminUser) {
      return NextResponse.json({ message: "Accès interdit" }, { status: 403 })
    }

    const couponId = id
    const body = await request.json()
    const { is_active, ...updateData } = body

    // Vérifier si le coupon existe
    const { data: existingCoupon, error: fetchError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .single()

    if (fetchError || !existingCoupon) {
      return NextResponse.json(
        { message: 'Coupon non trouvé' },
        { status: 404 }
      )
    }

    const updates: any = {}

    // Gérer l'activation/désactivation
    if (is_active !== undefined) {
      updates.is_active = is_active
    }

    // Si on réactive un coupon, vérifier les utilisations restantes
    if (is_active === true && existingCoupon.max_uses && existingCoupon.current_uses >= existingCoupon.max_uses) {
      return NextResponse.json(
        { message: 'Impossible de réactiver ce coupon : limite d\'utilisation atteinte' },
        { status: 400 }
      )
    }

    // Si on désactive un coupon, ne pas modifier les autres champs
    if (updateData && Object.keys(updateData).length > 0 && is_active !== false) {
      // Validation des données d'update comme dans la création
      if (updateData.code && updateData.code !== existingCoupon.code) {
        // Vérifier si le nouveau code existe déjà
        const { data: existingCode } = await supabase
          .from('coupons')
          .select('id')
          .eq('code', updateData.code.toUpperCase())
          .neq('id', couponId)
          .maybeSingle()

        if (existingCode) {
          return NextResponse.json(
            { message: 'Ce code promo existe déjà' },
            { status: 400 }
          )
        }
        updates.code = updateData.code.toUpperCase()
      }

      if (updateData.type) {
        if (!['percentage', 'fixed', 'free_shipping'].includes(updateData.type)) {
          return NextResponse.json(
            { message: 'Type de coupon invalide' },
            { status: 400 }
          )
        }
        updates.type = updateData.type
      }

      // Validation conditionnelle pour value selon le type
      if (updateData.value !== undefined) {
        const couponType = updateData.type || existingCoupon.type
        if ((couponType === 'percentage' || couponType === 'fixed') && updateData.value !== null) {
          updates.value = parseFloat(updateData.value.toString())
        } else if (couponType === 'free_shipping') {
          updates.value = null
        }
      }

      // Autres champs optionnels
      if (updateData.max_uses !== undefined) {
        updates.max_uses = updateData.max_uses ? parseInt(updateData.max_uses.toString()) : null
      }

      if (updateData.minimum_order !== undefined) {
        updates.minimum_order = parseFloat(updateData.minimum_order.toString())
      }

      if (updateData.expiration_date !== undefined) {
        updates.expiration_date = updateData.expiration_date ? new Date(updateData.expiration_date).toISOString() : null
      }

      if (updateData.description !== undefined) {
        updates.description = updateData.description || null
      }

      if (updateData.applicable_products !== undefined) {
        updates.applicable_products = updateData.applicable_products || null
      }

      if (updateData.applicable_categories !== undefined) {
        updates.applicable_categories = updateData.applicable_categories || null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'Aucune modification à apporter' },
        { status: 400 }
      )
    }

    // Mettre à jour le coupon
    const { data: updatedCoupon, error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', couponId)
      .select()
      .single()

    if (error) {
      console.error('Erreur mise à jour coupon:', error)
      return NextResponse.json(
        { message: 'Erreur lors de la mise à jour' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedCoupon)

  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
