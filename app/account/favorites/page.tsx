"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { useToast } from "@/hooks/use-toast"
import { useFavorites } from "@/hooks/use-favorites"
import type { Product, FavoriteItem } from "@/lib/types"
import { Heart, ArrowRight, ShoppingBag, AlertCircle, Loader2 } from "lucide-react"

export default function FavoritesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { favorites, toggleFavorite } = useFavorites()
  const [favoritesProducts, setFavoritesProducts] = useState<Product[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [pageLoading, setPageLoading] = useState(true)
  const [userChecked, setUserChecked] = useState(false)

  // Récupérer les produits favoris depuis l'API
  useEffect(() => {
    if (favorites.length > 0) {
      fetchFavoritesProducts()
    } else {
      setFavoritesProducts([])
      setLoadingFavorites(false)
    }
  }, [favorites])

  const fetchFavoritesProducts = async () => {
    try {
      setLoadingFavorites(true)

      // Récupérer tous les produits
      const productsRes = await fetch("/api/products")
      if (!productsRes.ok) {
        throw new Error("Erreur de récupération des produits")
      }

      const allProducts: Product[] = await productsRes.json()

      // Filtrer pour garder seulement les favoris
      const favoriteProducts = allProducts.filter(product =>
        favorites.some(fav => fav.product_id === product.id)
      )

      setFavoritesProducts(favoriteProducts)
    } catch (error) {
      console.error("Erreur chargement favoris:", error)
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger vos favoris. Veuillez réessayer.",
        variant: "destructive",
      })
    } finally {
      setLoadingFavorites(false)
    }
  }

  const handleRemoveFavorite = async (productId: string, productName?: string) => {
    const wasFavorite = favorites.some(fav => fav.product_id === productId)
    const result = await toggleFavorite(productId)

    if (result.success && wasFavorite) {
      setFavoritesProducts(prev => prev.filter(p => p.id !== productId))

      toast({
        title: "Retiré des favoris",
        description: `${productName} a été retiré de vos favoris.`,
      })
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de retirer le favori. Veuillez réessayer.",
        variant: "destructive",
      })
    }
  }



  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-neutral-600 mb-6">
              <Link href="/account" className="hover:text-neutral-900">Mon compte</Link>
              <span>/</span>
              <span className="text-neutral-900 font-medium">Mes favoris</span>
            </nav>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 mb-2">Mes Favoris</h1>
                <p className="text-neutral-600">
                  {favorites.length === 0
                    ? "Vous n'avez encore ajouté aucun produit à vos favoris."
                    : `Vous avez ${favorites.length} produit${favorites.length > 1 ? 's' : ''} dans vos favoris.`
                  }
                </p>
              </div>

              {favorites.length > 0 && (
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Continuer mes achats
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>

          {/* Contenu */}
          {favorites.length === 0 ? (
            // États vide
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-16">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart size={32} className="text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  Aucun favori pour le moment
                </h3>
                <p className="text-neutral-600 mb-8 max-w-md mx-auto">
                  Sauvegardez vos produits préférés en cliquant sur le cœur rouge dans les cartes produits.
                  Ils apparaitront ici pour un accès rapide.
                </p>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Découvrir nos produits
                  <ShoppingBag size={18} />
                </Link>
              </div>
            </div>
          ) : loadingFavorites ? (
            // État de chargement
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm">
                  <div className="aspect-[4/5] bg-neutral-200 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-neutral-200 rounded animate-pulse" />
                    <div className="h-6 bg-neutral-200 rounded animate-pulse w-1/2" />
                    <div className="h-8 bg-neutral-200 rounded animate-pulse w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : favoritesProducts.length === 0 ? (
            // États vide mais avec favoris (produits supprimés)
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-16">
              <div className="text-center">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle size={32} className="text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  Produits non disponibles
                </h3>
                <p className="text-neutral-600 mb-8 max-w-md mx-auto">
                  Certains produits de vos favoris ne sont plus disponibles. Découvrez d'autres produits similaires.
                </p>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Voir le catalogue
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          ) : (
            // Grille des favoris
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoritesProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>

              {/* Bouton pour supprimer tous les favoris si souhaité */}
              <div className="mt-12 text-center">
                <p className="text-sm text-neutral-500 mb-4">
                  Gérer vos favoris facilement :
                  cliqueez sur le cœur rouge d'un produit pour le retirer de vos favoris
                </p>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
