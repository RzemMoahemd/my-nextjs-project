import { createAdminClient } from "@/lib/supabase-admin"
import type { Product } from "@/lib/types"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProductsPageClient } from "@/components/products-page-client"

interface ProductsPageProps {
  searchParams: { category?: string; subcategory?: string }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  // Next.js 15+ : searchParams est une Promise, il faut l'await avant accès
  const params = await searchParams
  const category = params.category ?? null
  const subcategory = params.subcategory ?? null

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      category:categories!category_id(name),
      subcategory:categories!subcategory_id(name),
      subsubcategory:categories!subsubcategory_id(name)
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching products:", error)
  }

  // Transformer les données pour maintenir la compatibilité avec l'ancien format
  const products: Product[] = (data || []).map((product) => ({
    ...product,
    category: product.category?.name || product.category,
    subcategory: product.subcategory ? [product.subcategory.name] : product.subcategory || [],
    subsubcategory: product.subsubcategory?.name || product.subsubcategory || null,
  }))

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProductsPageClient
            initialProducts={products}
            initialCategory={category}
            initialSubcategory={subcategory}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
