import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { checkLowStock } from "@/lib/check-low-stock"
import { parseThresholdInput } from "@/lib/low-stock"
import { NextResponse } from "next/server"

// POST - Créer un produit (admin uniquement).
// Reçoit un FormData : champ "data" (JSON du formulaire) + fichiers "files" (images).
// Toutes les écritures (insert produits + upload storage) passent par le service role
// afin de ne pas dépendre des politiques RLS côté navigateur.
export async function POST(request: Request) {
  try {
    const serverClient = await createClient()
    const adminClient = createAdminClient()

    // Verify admin access
    const {
      data: { user },
    } = await serverClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: adminUser } = await serverClient.from("admin_users").select("*").eq("id", user.id).single()
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await request.formData()
    const rawData = formData.get("data")
    if (!rawData) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
    }
    const body = JSON.parse(rawData as string)
    const files = formData.getAll("files").filter((f): f is File => f instanceof File)

    // Convert category names to IDs for the new foreign key structure
    let categoryId = null
    let subcategoryId = null
    let subsubcategoryId = null

    if (body.category) {
      const { data: categoryData } = await adminClient
        .from("categories")
        .select("id")
        .eq("name", body.category)
        .single()
      categoryId = categoryData?.id || null
    }

    if (body.subcategory) {
      const { data: subcategoryData } = await adminClient
        .from("categories")
        .select("id")
        .eq("name", body.subcategory)
        .single()
      subcategoryId = subcategoryData?.id || null
    }

    if (body.subsubcategory) {
      const { data: subsubcategoryData } = await adminClient
        .from("categories")
        .select("id")
        .eq("name", body.subsubcategory)
        .single()
      subsubcategoryId = subsubcategoryData?.id || null
    }

    // Insert du produit (service role => ignore le RLS)
    const { data: product, error } = await adminClient
      .from("products")
      .insert({
        name: body.name,
        description: body.description,
        price: Number.parseFloat(body.price),
        promotional_price: body.promotional_price ? Number.parseFloat(body.promotional_price) : null,
        category: body.category || null,
        // La colonne legacy 'subcategory' est un tableau (TEXT[])
        subcategory: body.subcategory ? [body.subcategory] : null,
        subsubcategory: body.subsubcategory || null,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        subsubcategory_id: subsubcategoryId,
        sku: body.sku || null,
        badge: body.badge || null,
        // Champ vide / absent => null (hérite du seuil global, Paramètres > Vente)
        low_stock_threshold: parseThresholdInput(body.low_stock_threshold),
        sizes: body.sizes || [],
        colors: body.colors || [],
        variants: body.variants || [],
        images: [],
        is_active: body.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw error

    // Upload des images côté serveur (service role => ignore le RLS du storage)
    const uploadedUrls: string[] = []
    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-]/g, "_")
      const filename = `${product.id}/${Date.now()}-${safeName}`
      const { error: uploadError } = await adminClient.storage.from("products").upload(filename, file)
      if (uploadError) throw uploadError
      const {
        data: { publicUrl },
      } = adminClient.storage.from("products").getPublicUrl(filename)
      uploadedUrls.push(publicUrl)
    }

    let finalProduct = product
    if (uploadedUrls.length > 0) {
      const { data: updated, error: updateImagesError } = await adminClient
        .from("products")
        .update({ images: uploadedUrls })
        .eq("id", product.id)
        .select()
        .single()
      if (updateImagesError) throw updateImagesError
      finalProduct = updated
    }

    // Alerte stock faible si le stock initial est déjà sous le seuil (non bloquant)
    await checkLowStock(adminClient, product.id)

    return NextResponse.json(finalProduct)
  } catch (error) {
    console.error("[products/create] Error:", error)
    const message = error instanceof Error ? error.message : "Failed to create product"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}