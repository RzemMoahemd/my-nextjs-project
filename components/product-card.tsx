"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import type { Product } from "@/lib/types"
import { ArrowUpRight, ShoppingBag, ChevronLeft, ChevronRight, AlertCircle, ChevronDown, Heart } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCart } from "@/components/cart-provider"
import { useToast } from "@/hooks/use-toast"
import { useFavorites } from "@/hooks/use-favorites"
import { createClientComponentClient } from "@/lib/supabase-client"

interface ProductCardProps {
  product: Product
  index?: number
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const router = useRouter()
  const { addItem } = useCart()
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

  const [color, setColor] = useState<string>(initialColor)
  const [size, setSize] = useState<string>(initialSize)

  // Reset size when color changes
  useEffect(() => {
    const newAvailableSizes = getAvailableSizes()
    if (!newAvailableSizes.includes(size)) {
      setSize(newAvailableSizes[0] || "")
    }
  }, [color])

  // Calculate total stock from variants
  const totalStock = product.variants?.reduce((sum, v) => sum + v.quantity, 0) ?? 0

  // Get available quantity for selected color and size
  const getAvailableQuantity = () => {
    if (!color || !size) return 0
    const variant = product.variants?.find(v => v.color === color && v.size === size)
    return variant?.quantity ?? 0
  }

  // Get available sizes for selected color
  const getAvailableSizes = () => {
    if (!color) return []
    return product.variants
      ?.filter(v => v.color === color && v.quantity > 0)
      .map(v => v.size) || []
  }

  const availableSizes = getAvailableSizes()
  const available = getAvailableQuantity()
  const canPurchase = product.is_active && size && color && available > 0

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

  // Check if product should show promo badge
  const hasPromo = totalStock === 0

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

  const handleAdd = async (goCheckout = false) => {
    if (!size) {
      toast({
        title: "Choisissez une taille",
        description: "Sélectionnez une taille avant d'ajouter au panier.",
      })
      return
    }
    if (!color) {
      toast({
        title: "Choisissez une couleur",
        description: "Sélectionnez une couleur avant d'ajouter au panier.",
      })
      return
    }

    // Check availability for selected variant
    const quantity = product.variants?.find(v => v.color === color && v.size === size)?.quantity ?? 0
    if (quantity <= 0) {
      toast({
        title: "Stock épuisé",
        description: "Cette variante n'est plus disponible.",
      })
      return
    }

    const finalPrice = product.promotional_price ?? product.price

    try {
      await addItem({
        productId: product.id,
        name: product.name,
        price: finalPrice,
        size,
        color,
        image: product.images?.[0],
      })

      toast({
        title: goCheckout ? "Produit prêt à être commandé" : "Ajouté au panier",
        description: `${product.name} (${size}) ${goCheckout ? "est prêt pour le paiement." : "a été ajouté à votre panier."}`,
      })

      if (goCheckout) {
        router.push("/checkout")
      }
    } catch (error: any) {
      if (error?.name === "INSUFFICIENT_STOCK" || error?.message?.includes("épuisée")) {
        toast({
          title: "Quantité disponible épuisée",
          description: "Cette taille n'est plus disponible en stock.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Impossible d'ajouter le produit",
          description: "Veuillez réessayer dans quelques instants.",
        })
      }
      console.error(error)
    }
  }

  // Gestion des animations d'entrée
  const animationDelay = index * 0.1

  // Gestionnaire pour empêcher la navigation lors de la sélection de variants
  const handleVariantClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault()
    e.stopPropagation()
    action()
  }

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
    >
      <Link href={`/products/${product.id}`}>
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
                  className={`object-cover object-center transition-opacity duration-300 ${
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

              {/* Badges */}
              <div className="flex flex-col gap-1">
                {hasPromo && (
                  <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                    PROMO
                  </div>
                )}
                {product.badge === 'new' && (
                  <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                    NOUVEAU
                  </div>
                )}
                {product.badge === 'top_sale' && (
                  <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                    TOP VENTE
                  </div>
                )}
              </div>
            </div>

            {/* INDICATEUR DE STOCK PROFESSIONNEL */}
            {totalStock > 0 && totalStock <= 5 && (
              <div className="absolute top-3 left-3 bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
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
      </Link>

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

        {/* PRIX - COLLÉ AU TITRE */}
        {product.promotional_price && product.promotional_price < product.price ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-400 line-through">
              {product.price.toFixed(2)} €
            </span>
            <span className="text-lg font-bold text-red-600">
              {product.promotional_price.toFixed(2)} €
            </span>
          </div>
        ) : (
          <span className="text-lg font-bold text-neutral-900">
            {product.price.toFixed(2)} €
          </span>
        )}

        {/* SÉLECTEURS MINIMALISTES AVEC POPOVERS - COLLÉS AU PRIX */}
        <div
          className="flex gap-2"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          {/* POPOVER COULEURS */}
          {(product.colors && product.colors.length > 0 && !product.colors.includes('aucune_couleur')) && (
            <Popover onOpenChange={(open) => {
              // Empêcher les événements au niveau popover
              if (open) return
            }}>
              <PopoverTrigger asChild>
                <button className="flex-1 flex items-center justify-between px-3 py-2 text-sm border border-neutral-300 rounded-md hover:border-neutral-400 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-neutral-300"
                      style={{ backgroundColor: getColorHex(color) }}
                    />
                    <span className="text-neutral-700 font-medium">
                      Couleur: {color}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-neutral-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-3"
                align="start"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-neutral-900">Choisir une couleur</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {product.colors.map((colorName) => {
                      const isAvailable = product.variants?.some(v => v.color === colorName && v.quantity > 0)
                      const colorHex = getColorHex(colorName)

                      return (
                        <button
                          key={colorName}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setColor(colorName)
                          }}
                          disabled={!isAvailable}
                          className={`relative w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                            color === colorName
                              ? 'border-neutral-900 scale-110'
                              : 'border-neutral-300 hover:border-neutral-400 hover:scale-105'
                          } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:border-neutral-300`}
                          title={`${colorName}${!isAvailable ? ' (Indisponible)' : ''}`}
                          style={{
                            backgroundColor: colorHex,
                            boxShadow: color === colorName
                              ? `0 0 0 2px ${colorHex}, 0 0 0 4px #000000`
                              : colorHex === '#FFFFFF'
                                ? '0 0 0 1px #D1D5DB, inset 0 0 0 1px #F3F4F6'
                                : 'none'
                          }}
                        >
                          {/* Indicateur de sélection pour couleurs claires */}
                          {color === colorName && colorHex === '#FFFFFF' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 bg-neutral-900 rounded-full"></div>
                            </div>
                          )}

                          {/* Indicateur d'indisponibilité */}
                          {!isAvailable && (
                            <div className="absolute inset-0 bg-neutral-100 bg-opacity-75 rounded-full flex items-center justify-center">
                              <div className="w-3 h-0.5 bg-neutral-400 rounded-full transform rotate-45"></div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* POPOVER TAILLES */}
          {(product.sizes && product.sizes.length > 0) && (
            <Popover onOpenChange={(open) => {
              // Empêcher les événements au niveau popover
              if (open) return
            }}>
              <PopoverTrigger asChild>
                <button className="flex-1 flex items-center justify-between px-3 py-2 text-sm border border-neutral-300 rounded-md hover:border-neutral-400 hover:bg-neutral-50 transition-colors">
                  <span className="text-neutral-700 font-medium">
                    Taille: {size || 'Aucune'}
                  </span>
                  <ChevronDown size={16} className="text-neutral-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-3"
                align="end"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-neutral-900">Choisir une taille</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {product.sizes.map((s) => {
                      const isAvailable = availableSizes.includes(s)
                      return (
                        <button
                          key={s}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setSize(s)
                          }}
                          disabled={!isAvailable}
                          className={`relative px-3 py-2 text-sm font-medium rounded border-2 transition-all duration-200 ${
                            size === s
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50'
                          } disabled:opacity-40 disabled:cursor-not-allowed disabled:text-neutral-400 disabled:border-neutral-200 disabled:hover:border-neutral-200 disabled:hover:bg-white`}
                        >
                          {s}
                          {size === s && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full border border-neutral-900"></div>
                          )}
                          {!isAvailable && (
                            <div className="absolute inset-0 bg-neutral-100 bg-opacity-75 rounded flex items-center justify-center">
                              <div className="w-2 h-0.5 bg-neutral-400 rounded-full"></div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {availableSizes.length === 0 && color && (
                    <div className="flex items-center gap-2 text-red-500 mt-2">
                      <AlertCircle size={12} />
                      <p className="text-xs">Aucune taille disponible pour "{color}"</p>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* BOUTONS D'ACTION - COLLÉS AUX SÉLECTEURS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={(e) => handleVariantClick(e, () => handleAdd(false))}
            disabled={!canPurchase}
            className="w-full bg-neutral-900 text-white py-2.5 rounded-lg font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Ajouter
          </button>
          <button
            onClick={(e) => handleVariantClick(e, () => handleAdd(true))}
            disabled={!canPurchase}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Acheter
          </button>
        </div>
      </div>
    </div>
  )
}
