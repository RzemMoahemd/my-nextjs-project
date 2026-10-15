import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { checkLowStock } from "@/lib/check-low-stock"
import { parseThresholdInput } from "@/lib/low-stock"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Accepte du JSON (ancien format) ou du FormData (champ "data" + fichiers "files")
    const contentType = request.headers.get("content-type") || ""
    let body: any
    let files: File[] = []
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const rawData = formData.get("data")
      if (!rawData) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
      }
      body = JSON.parse(rawData as string)
      files = formData.getAll("files").filter((f): f is File => f instanceof File)
    } else {
      body = await request.json()
    }

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

    // Upload des nouvelles images côté serveur (service role => ignore le RLS du storage)
    const uploadedUrls: string[] = []
    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-]/g, "_")
      const filename = `${id}/${Date.now()}-${safeName}`
      const { error: uploadError } = await adminClient.storage.from("products").upload(filename, file)
      if (uploadError) throw uploadError
      const {
        data: { publicUrl },
      } = adminClient.storage.from("products").getPublicUrl(filename)
      uploadedUrls.push(publicUrl)
    }
    const finalImages = [...(body.images || []), ...uploadedUrls]

    // Update product with both old and new column formats for compatibility
    const { data, error } = await adminClient
      .from("products")
      .update({
        name: body.name,
        description: body.description,
        price: Number.parseFloat(body.price),
        promotional_price: body.promotional_price ? Number.parseFloat(body.promotional_price) : null,
        // La colonne legacy 'subcategory' est un tableau (TEXT[]) : accepter chaîne ou tableau
        category: body.category || null,
        subcategory: body.subcategory
          ? Array.isArray(body.subcategory)
            ? body.subcategory
            : [body.subcategory]
          : null,
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
        images: finalImages,
        is_active: body.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    // Recalculer les notifications de stock faible après édition (non bloquant)
    await checkLowStock(adminClient, id)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Update error:", error)
    const message = error instanceof Error ? error.message : "Failed to update product"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
