"use client"

import { useEffect, useMemo, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import type { Product } from "@/lib/types"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Heart } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useCart } from "@/components/cart-provider"
import { useToast } from "@/hooks/use-toast"
import { useFavorites } from "@/hooks/use-favorites"
import { createClientComponentClient } from "@/lib/supabase-client"

export default function ProductDetail() {
  const params = useParams()
  const router = useRouter()
  const { addItem } = useCart()
  const { toast } = useToast()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [user, setUser] = useState<any>(null)
  const favorite = isFavorite(params.id as string)

  useEffect(() => {
    fetchProduct()
  }, [params.id])

  // Vérifier l'authentification utilisateur
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClientComponentClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkAuth()
  }, [])

  // Vérifier les stocks en temps réel toutes les 5 secondes
  useEffect(() => {
    if (!product?.id) return
    const interval = setInterval(() => {
      fetch(`/api/products/${product.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.variants) {
            setProduct((prev) => {
              if (!prev) return null
              return { ...prev, variants: data.variants }
            })
          }
        })
        .catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [product?.id])

  async function fetchProduct() {
    try {
      const res = await fetch(`/api/products/${params.id}`)
      if (!res.ok) throw new Error("Product not found")
      const data = await res.json()
      setProduct(data)
      
      // Sélectionner la première couleur disponible
      if (data.colors && data.colors.length > 0) {
        setSelectedColor(data.colors[0])
      }
      
      // Sélectionner la première taille disponible
      if (data.sizes && data.sizes.length > 0) {
        setSelectedSize(data.sizes[0])
      }

      // Fetch related products
      const relatedRes = await fetch(`/api/products?category=${data.category}&limit=4`)
      const relatedData = await relatedRes.json()
      setRelatedProducts(relatedData.filter((p: Product) => p.id !== data.id).slice(0, 3))
    } catch (error) {
      console.error("[v0] Error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculer la quantité disponible pour la variante sélectionnée
  const availableQuantity = useMemo(() => {
    if (!product || !selectedColor || !selectedSize) return 0
    const variant = product.variants?.find(v => v.color === selectedColor && v.size === selectedSize)
    return variant?.quantity ?? 0
  }, [product, selectedColor, selectedSize])

  // Calculer les tailles disponibles pour la couleur sélectionnée
  const availableSizes = useMemo(() => {
    if (!product || !selectedColor) return new Set<string>()
    const sizesForColor = product.variants
      ?.filter(v => v.color === selectedColor && v.quantity > 0)
      .map(v => v.size) ?? []
    return new Set(sizesForColor)
  }, [product, selectedColor])

  // Vérifier si une taille est disponible pour la couleur sélectionnée
  const isSizeAvailable = (size: string) => {
    if (!selectedColor) return true
    return availableSizes.has(size)
  }

  // Ajuster la taille sélectionnée si elle n'est pas disponible pour la couleur actuelle
  useEffect(() => {
    if (!selectedColor || !selectedSize) return
    if (!isSizeAvailable(selectedSize)) {
      // Si la taille sélectionnée n'est pas disponible, sélectionner la première taille disponible
      const firstAvailableSize = Array.from(availableSizes)[0]
      setSelectedSize(firstAvailableSize || null)
    }
  }, [selectedColor, availableSizes])

  const canPurchase = Boolean(product?.is_active && selectedSize && selectedColor && availableQuantity > 0)


  const handleAddToCart = async () => {
    if (!product) return
    if (!selectedColor) {
      toast({
        title: "Sélectionnez une couleur",
        description: "Veuillez choisir une couleur avant d'ajouter au panier.",
      })
      return
    }
    if (!selectedSize) {
      toast({
        title: "Sélectionnez une taille",
        description: "Veuillez choisir une taille avant d'ajouter au panier.",
      })
      return
    }
    if (availableQuantity <= 0) {
      toast({
        title: "Variante indisponible",
        description: "Cette combinaison couleur/taille est en rupture de stock.",
      })
      return
    }

    try {
      const finalPrice = product.promotional_price ?? product.price
      
      await addItem({
        productId: product.id,
        name: product.name,
        price: finalPrice,
        size: selectedSize,
        color: selectedColor,
        image: product.images?.[0],
      })

      toast({
        title: "Ajouté au panier",
        description: `${product.name} (${selectedColor}, ${selectedSize}) a été ajouté à votre panier.`,
      })
    } catch (error: any) {
      if (error?.name === "INSUFFICIENT_STOCK" || error?.message?.includes("épuisée")) {
        toast({
          title: "Quantité disponible épuisée",
          description: "La quantité demandée n'est plus disponible en stock. Veuillez sélectionner une autre taille ou réduire la quantité.",
          variant: "destructive",
        })
        // Recharger le produit pour mettre à jour les stocks
        fetchProduct()
      } else {
        toast({
          title: "Impossible d'ajouter",
          description: "Merci de réessayer dans quelques instants.",
          variant: "destructive",
        })
      }
      console.error(error)
    }
  }

  const handleBuyNow = async () => {
    await handleAddToCart()
    router.push("/checkout")
  }

  // Gestionnaire pour le favori
  const handleFavoriteClick = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour ajouter des favoris.",
        variant: "destructive",
      })
      return
    }

    if (!product) return

    const result = await toggleFavorite(product.id)

    if (result.success) {
      toast({
        title: favorite ? "Retiré des favoris" : "Ajouté aux favoris",
        description: `${product.name} ${favorite ? 'a été retiré de' : 'a été ajouté à'} vos favoris.`,
      })
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de modifier les favoris. Veuillez réessayer.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-neutral-600">Chargement...</p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-white flex items-center justify-center">
          <p className="text-neutral-600">Produit non trouvé</p>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="mb-8 flex items-center gap-2 text-sm text-neutral-600">
            <a href="/products" className="hover:text-neutral-900">
              Produits
            </a>
            <span>/</span>
            <span className="text-neutral-900">{product.name}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative h-96 md:h-[500px] bg-neutral-100 rounded-lg overflow-hidden">
                {product.images.length > 0 ? (
                  <Image
                    src={product.images[selectedImageIndex] || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">Pas d'image</div>
                )}

                {/* Arrows */}
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setSelectedImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1))
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() =>
                        setSelectedImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1))
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`flex-shrink-0 h-20 w-20 rounded-lg overflow-hidden border-2 transition ${
                        idx === selectedImageIndex ? "border-neutral-900" : "border-neutral-200"
                      }`}
                    >
                      <Image
                        src={img || "/placeholder.svg"}
                        alt={`${product.name} ${idx + 1}`}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-6">
              {/* Title and Category */}
              <div className="relative">
                <p className="text-neutral-600 text-sm mb-2">{product.category}</p>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 flex-1">{product.name}</h1>
                  {/* Bouton favori */}
                  <button
                    onClick={handleFavoriteClick}
                    className={`p-3 rounded-full transition-all duration-200 shadow-lg ${
                      favorite
                        ? 'bg-red-500 text-white'
                        : 'bg-white/90 text-neutral-400 hover:text-red-500'
                    }`}
                    title={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    <Heart size={20} className={favorite ? 'fill-current' : ''} />
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="py-4 border-y border-neutral-200">
                {product.promotional_price && product.promotional_price < product.price ? (
                  <div className="flex items-center gap-3">
                    <p className="text-2xl text-neutral-500 line-through">{product.price.toFixed(2)} DT</p>
                    <p className="text-4xl font-bold text-red-600">{product.promotional_price.toFixed(2)} DT</p>
                  </div>
                ) : (
                  <p className="text-4xl font-bold text-neutral-900">{product.price.toFixed(2)} DT</p>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Description</h3>
                <p className="text-neutral-700 leading-relaxed">{product.description}</p>
              </div>

              {/* Colors */}
              {product.colors && product.colors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-3">Couleur</h3>
                  <div className="flex flex-wrap gap-3">
                    {product.colors.map((colorName) => (
                      <button
                        key={colorName}
                        onClick={() => setSelectedColor(colorName)}
                        className={`px-6 py-2 rounded-lg border-2 font-semibold transition ${
                          selectedColor === colorName
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200 text-neutral-900 hover:border-neutral-900"
                        }`}
                      >
                        {colorName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-3">Taille</h3>
                  <div className="flex flex-wrap gap-3">
                    {product.sizes.map((size) => {
                      const isAvailable = isSizeAvailable(size)
                      return (
                        <button
                          key={size}
                          onClick={() => isAvailable && setSelectedSize(size)}
                          disabled={!isAvailable}
                          className={`px-6 py-2 rounded-lg border-2 font-semibold transition ${
                            selectedSize === size
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : !isAvailable
                              ? "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed line-through"
                              : "border-neutral-200 text-neutral-900 hover:border-neutral-900"
                          }`}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                  {selectedColor && (
                    <p className="text-sm text-neutral-500 mt-2">
                      Les tailles barrées ne sont pas disponibles pour la couleur {selectedColor}
                    </p>
                  )}
                </div>
              )}

              {/* Stock Status */}
              <div
                className={`p-4 rounded-lg ${product.is_active && availableQuantity > 0 ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}
              >
                {product.is_active && availableQuantity > 0 ? (
                  <p className="font-semibold">Disponible</p>
                ) : (
                  <p className="font-semibold">Actuellement indisponible</p>
                )}
              </div>

              {product.is_active && availableQuantity > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={handleAddToCart}
                      disabled={!canPurchase}
                      className="w-full bg-neutral-900 text-white py-4 rounded-lg font-bold transition hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Ajouter au panier
                    </button>
                    <button
                      onClick={handleBuyNow}
                      disabled={!canPurchase}
                      className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Acheter maintenant
                    </button>
                  </div>
                </>
              ) : (
                <button
                  disabled
                  className="w-full bg-neutral-200 text-neutral-400 py-4 rounded-lg font-bold cursor-not-allowed"
                >
                  Rupture de stock
                </button>
              )}
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="mt-16 pt-8 border-t border-neutral-200">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Produits similaires</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedProducts.map((p) => (
                  <a key={p.id} href={`/products/${p.id}`} className="group">
                    <div className="relative h-64 bg-neutral-100 rounded-lg overflow-hidden mb-3">
                      {p.images.length > 0 && (
                        <Image
                          src={p.images[0] || "/placeholder.svg"}
                          alt={p.name}
                          fill
                          className="object-cover group-hover:scale-105 transition"
                        />
                      )}
                    </div>
                    <h3 className="font-semibold text-neutral-900 line-clamp-2 mb-1">{p.name}</h3>
                    <p className="text-lg font-bold text-neutral-900">{p.price.toFixed(2)} €</p>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
