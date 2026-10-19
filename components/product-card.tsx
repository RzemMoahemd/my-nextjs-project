"use client"

import Image from "next/image"

import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import type { Product } from "@/lib/types"
import { ArrowUpRight, ShoppingBag, ChevronLeft, ChevronRight, Heart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFavorites } from "@/hooks/use-favorites"
import { createClientComponentClient } from "@/lib/supabase-client"
import { useSettings, useCurrency } from "@/components/settings-provider"
import { getDisplayThreshold } from "@/lib/low-stock"
import { hasActivePromo, getDiscountPercent, getStoredBadge, isOutOfStock } from "@/lib/product-badges"

interface ProductCardProps {
  product: Product
  index?: number
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isHovered, setIsHovered] = useState(false)
  const [user, setUser] = useState<any>(null)
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(product.id)

  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClientComponentClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkAuth()
  }, [])

  // Gestionnaire pour le favori
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // Empêcher la navigation

    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour ajouter des favoris.",
        variant: "destructive",
      })
      return
    }

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

  // Find a variant with stock to use as initial selection
  const getInitialVariant = () => {
    const availableVariant = product.variants?.find(v => v.quantity > 0)
    return availableVariant || product.variants?.[0]
  }

  const initialVariant = getInitialVariant()
  const initialColor = initialVariant?.color ?? (product.colors?.includes('aucune_couleur') ? 'aucune_couleur' : product.colors?.[0]) ?? ""
  const initialSize = initialVariant?.size ?? product.sizes?.[0] ?? ""

  // Calculate total stock from variants
  const totalStock = product.variants?.reduce((sum, v) => sum + v.quantity, 0) ?? 0

  // Vérifier si une taille est en rupture de stock (aucune variante avec quantity > 0 pour cette taille)
  const isSizeOutOfStock = (sizeName: string) => {
    if (!product.variants || product.variants.length === 0) return true
    const variantsForSize = product.variants.filter(v => v.size === sizeName)
    // Pas de variante pour cette taille = épuisée
    if (variantsForSize.length === 0) return true
    // Toutes les variantes de cette taille ont quantity = 0 = épuisée
    return variantsForSize.every(v => v.quantity === 0)
  }

  // Image carousel state
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [hasCompletedFirstTour, setHasCompletedFirstTour] = useState(false)
  const carouselIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const dragThreshold = 50

  // Image navigation functions
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length)
  }

  const goToImage = (index: number) => {
    setCurrentImageIndex(index)
  }

  // Badges : PROMO = remise réelle + stock disponible (jamais en rupture).
  // RUPTURE = totalStock <= 0 (prioritaire sur tout).
  const outOfStock = isOutOfStock(product)
  const showPromo = hasActivePromo(product)
  const discountPercent = getDiscountPercent(product)
  const storedBadge = getStoredBadge(product)

  // Reset carousel when leaving
  const handleMouseLeave = () => {
    setIsHovering(false)
    if (!hasCompletedFirstTour) {
      setCurrentImageIndex(0)
    }
  }

  // First tour auto-play on initial hover
  useEffect(() => {
    if (isHovering && product.images.length > 1 && !hasCompletedFirstTour && !isDragging) {
      let imageIndex = 0
      carouselIntervalRef.current = setInterval(() => {
        imageIndex++
        if (imageIndex >= product.images.length) {
          setHasCompletedFirstTour(true)
          if (carouselIntervalRef.current) {
            clearInterval(carouselIntervalRef.current)
          }
          return
        }
        setCurrentImageIndex(imageIndex)
      }, 600)
    }

    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current)
      }
    }
  }, [isHovering, hasCompletedFirstTour, isDragging, product.images.length])

  // Handle global mouse events for drag
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !hasCompletedFirstTour) return
      const currentX = e.clientX
      const deltaX = startX - currentX

      if (Math.abs(deltaX) > dragThreshold) {
        if (deltaX > 0) {
          nextImage()
        } else {
          prevImage()
        }
        setIsDragging(false)
      }
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, hasCompletedFirstTour, startX])

  const { appearance, stock } = useSettings()
  const currency = useCurrency()

  // Seuil d'AFFICHAGE du message "Plus que X disponible" sur la carte produit.
  // Dépend UNIQUEMENT du réglage global (Paramètres > Vente :
  // stock.low_stock_display_threshold). Le low_stock_threshold de la fiche
  // produit est ignoré ici — il ne sert qu'aux notifications admin.
  // Le message se base sur la variante SÉLECTIONNÉE (couleur + taille).
  const displayThreshold = getDisplayThreshold(stock?.low_stock_display_threshold)

  // Gestion des animations d'entrée
  const animationDelay = index * 0.1
  // Fonction pour obtenir la valeur hexadécimale d'une couleur
  const getColorHex = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      'Noir': '#000000',
      'Blanc': '#FFFFFF',
      'Rouge': '#DC2626',
      'Bleu': '#2563EB',
      'Vert': '#16A34A',
      'Jaune': '#EAB308',
      'Rose': '#EC4899',
      'Violet': '#8B5CF6',
      'Gris': '#6B7280',
      'Beige': '#D4B08A',
      'Marron': '#92400E',
      'Orange': '#EA580C',
      'Turquoise': '#06B6D4',
      'Bordeaux': '#7F1D1D',
      'Argent': '#E5E7EB',
      'Or': '#F59E0B',
      'Bleu clair': '#60A5FA',
      'Bleu marine': '#1E3A8A',
      'Bleu foncé': '#1E40AF',
      'Vert forêt': '#166534',
      'Vert olive': '#4B5563',
      'Rose pâle': '#FBCFE8',
      'Rouge brique': '#B91C1C',
      'Gris clair': '#F3F4F6',
      'Gris anthracite': '#374151',
      'Bleu ciel': '#0EA5E9',
      'Corail': '#FF6B6B',
      'Gris foncé': '#374151',
      'Bleu nuit': '#1E3A8A',
    }
    return colorMap[colorName] || '#6B7280' // Gris par défaut
  }

  return (
    <div
      className={`bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer`}
      style={{
        animation: `fadeInUp 0.6s ease-out ${animationDelay}s both`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => router.push(`/products/${product.id}`)}
    >
      <div className="relative">
          {/* IMAGE FIXE 4:5 AVEC PLACEHOLDER ÉLÉGANT */}
          <div
            className="relative bg-neutral-100 overflow-hidden group cursor-grab active:cursor-grabbing"
            style={{ aspectRatio: '4/5', minHeight: '320px' }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={handleMouseLeave}
            onMouseDown={(e) => {
              if (!hasCompletedFirstTour) return
              e.preventDefault()
              setIsDragging(true)
              setStartX(e.clientX)
            }}
            onMouseMove={(e) => {
              if (!isDragging || !hasCompletedFirstTour) return
              e.preventDefault()
              const currentX = e.clientX
              const deltaX = startX - currentX

              if (Math.abs(deltaX) > dragThreshold) {
                if (deltaX > 0) {
                  nextImage()
                } else {
                  prevImage()
                }
                setIsDragging(false)
              }
            }}
            onMouseUp={() => {
              setIsDragging(false)
            }}
          >
            {product.images.length > 0 ? (
              product.images.map((image, index) => (
                <Image
                  key={index}
                  src={image || "/placeholder.svg"}
                  alt={`${product.name} - ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className={`object-cover object-center transition-opacity duration-500 bg-neutral-100 ${
                    index === currentImageIndex ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100">
                <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mb-2">
                  <ShoppingBag size={24} className="text-neutral-400" />
                </div>
                <span className="text-xs text-neutral-500 font-medium">Image non disponible</span>
              </div>
            )}

            {/* Navigation arrows */}
            {product.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    prevImage()
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                >
                  <ChevronLeft size={16} className="text-neutral-700" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    nextImage()
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                >
                  <ChevronRight size={16} className="text-neutral-700" />
                </button>
              </>
            )}

            {/* Image indicators */}
            {product.images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {product.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      goToImage(index)
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex
                        ? "bg-white shadow-sm"
                        : "bg-white/60 hover:bg-white/80"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Bouton favori et badges */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {/* Bouton favori */}
              <button
                onClick={handleFavoriteClick}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                  favorite
                    ? 'bg-red-500 text-white'
                    : 'bg-white/90 text-neutral-400 hover:text-red-500'
                }`}
                title={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Heart size={16} className={favorite ? 'fill-current' : ''} />
              </button>

              {/* Badges — priorité : RUPTURE > PROMO > NOUVEAU / TOP VENTE */}
              <div className="flex flex-col gap-1 items-end">
                {outOfStock ? (
                  <div className="bg-neutral-900 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                    RUPTURE
                  </div>
                ) : (
                  <>
                    {showPromo && (
                      <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                        {discountPercent > 0 ? `PROMO -${discountPercent}%` : "PROMO"}
                      </div>
                    )}
                    {storedBadge === 'new' && (
                      <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                        NOUVEAU
                      </div>
                    )}
                    {storedBadge === 'top_sale' && (
                      <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                        TOP VENTE
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* INDICATEUR DE STOCK PROFESSIONNEL
                Basé sur la variante SÉLECTIONNÉE (couleur + taille), pas le stock total.
                Le message n'apparaît que si cette variante précise a une quantité
                inférieure ou égale au seuil d'affichage (Paramètres > Vente). */}
            {totalStock > 0 && totalStock <= displayThreshold && (
              <div className="absolute top-3 left-3 bg-[var(--color-accent)] text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                Plus que {totalStock} disponible{totalStock > 1 ? 's' : ''}
              </div>
            )}

            {!product.is_active && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white px-4 py-2 rounded-lg shadow-lg">
                  <span className="text-neutral-900 font-semibold text-sm">Non disponible</span>
                </div>
              </div>
            )}
          </div>
        </div>
  

      {/* CONTENU COMPACT - TOUT ENTIÈREMENT COLLÉ */}
      <div className="p-4 pb-4 flex flex-col gap-2">
        {/* TITRE - NOMBRE PRODUIT ET CATÉGORIE */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-neutral-900 line-clamp-2 text-sm leading-tight">
              {product.name}
            </h3>
            <p className="text-neutral-500 text-xs mt-1 font-medium uppercase tracking-wide">
              {product.category}
            </p>
          </div>
          <div className="text-xs text-neutral-400 inline-flex items-center gap-1 flex-shrink-0">
            Voir
            <ArrowUpRight size={14} />
          </div>
        </div>

        {/* PRIX - COLLÉ AU TITRE (promo masquée en rupture de stock) */}
        {showPromo ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-400 line-through">
              {product.price.toFixed(2)} {currency}
            </span>
            <span
              className="text-lg font-bold"
              style={{ color: appearance?.accent_color || "#F59E0B" }}
            >
              {(product.promotional_price ?? product.price).toFixed(2)} {currency}
            </span>
          </div>
        ) : (
          <span className="text-lg font-bold text-neutral-900">
            {product.price.toFixed(2)} {currency}
          </span>
        )}

        {/* TAILLES DISPONIBLES SOUS FORME DE CERCLES */}
        {(product.sizes && product.sizes.length > 0) && (
          <div className="mt-3">
            <p className="text-xs text-neutral-500 font-medium mb-2">Tailles</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => {
                const outOfStock = isSizeOutOfStock(s)
                return (
                  <span
                    key={s}
                    className={`w-8 h-8 rounded-full border relative flex items-center justify-center text-xs font-medium transition-colors ${
                      outOfStock
                        ? 'border-neutral-400 text-neutral-500 bg-neutral-100 opacity-80'
                        : 'border-neutral-300 text-neutral-700 bg-white hover:border-neutral-400 hover:bg-neutral-50 cursor-pointer'
                    }`}
                    title={outOfStock ? `${s} - Épuisé` : s}
                  >
                    <>
                    {s}
                    {outOfStock && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="border-t-2 border-current w-full opacity-90"></span>
                      </span>
                    )}
                  </>
                  </span>
                )
              })}
            </div>
          </div>
        )}





      </div>
    </div>
  )
}
