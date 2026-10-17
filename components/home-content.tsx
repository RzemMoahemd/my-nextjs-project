'use client'

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { Product, Category } from "@/lib/types"
import type { HomepageConfig } from "@/lib/settings"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Mapping des catégories aux images
const categoryImages: Record<string, { url: string; alt: string }> = {
  "Jeans": {
    url: "https://images.unsplash.com/photo-1578693082747-50c396cacd81?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTAwNDR8MHwxfHNlYXJjaHwxMHx8U3R5bGlzaCUyMGplYW5zJTIwZGVuaW0lMjBwYW50cyUyMG9uJTIwbW9kZWwlMjBvciUyMG1hbm5lcXVpbiUyQyUyMG1vZGVybiUyMGJsdWUlMjBqZWFucyUyMGZhc2hpb24lMjBkaXNwbGF5fGVufDB8MXx8fDE3NjQ2MTA0Nzd8MA&ixlib=rb-4.1.0&q=85",
    alt: "Collection Jeans - Velizar Ivanov on Unsplash"
  },
  "Hoodies": {
    url: "https://images.pexels.com/photos/18449948/pexels-photo-18449948.png",
    alt: "Collection Hoodies - Ayberk Mirza on Pexels"
  },
  "Pantalons": {
    url: "https://images.pexels.com/photos/7873046/pexels-photo-7873046.jpeg",
    alt: "Collection Pantalons - cottonbro studio on Pexels"
  },
  "T-shirts": {
    url: "https://images.unsplash.com/photo-1598970435748-1f04b45d0b80?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTAwNDR8MHwxfHNlYXJjaHwzfHxTdHlsaXNoJTIwdC1zaGlydCUyMG9uJTIwbW9kZWwlMjBvciUyMG1hbm5lcXVpbiUyQyUyMG1vZGVybiUyMGNhc3VhbCUyMHRlZSUyMHNoaXJ0JTIwZmFzaGlvbiUyMGRpc3BsYXl8ZW58MHwxfHx8MTc2NDYxMDc2MHww&ixlib=rb-4.1.0&q=85",
    alt: "Collection T-shirts - Sigmund on Unsplash"
  },
  "Robes": {
    url: "https://images.pexels.com/photos/5442252/pexels-photo-5442252.jpeg",
    alt: "Collection Robes - Chic by Dzii on Pexels"
  },
  "Vestes": {
    url: "https://images.pexels.com/photos/19192218/pexels-photo-19192218.jpeg",
    alt: "Collection Vestes - Vitaly Gorbachev on Pexels"
  },
  "Shorts": {
    url: "https://images.unsplash.com/photo-1584370848036-d63286d83fa4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTAwNDR8MHwxfHNlYXJjaHw2fHxDYXN1YWwlMjBzaG9ydHMlMjBvbiUyMG1vZGVsJTIwb3IlMjBtYW5uZXF1aW4lMkMlMjBzdW1tZXIlMjBzaG9ydHMlMjBmYXNoaW9uJTIwZGlzcGxheXxlbnwwfDF8fHwxNzY0NjEwNzYwfDA&ixlib=rb-4.1.0&q=85",
    alt: "Collection Shorts - engin akyurt on Unsplash"
  },
  "Chemises": {
    url: "https://images.pexels.com/photos/25987974/pexels-photo-25987974.jpeg",
    alt: "Collection Chemises - Alina Matveycheva on Pexels"
  },
  "Chaussures": {
    url: "https://images.unsplash.com/photo-1565814636199-ae8133055c1c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTAwNDR8MHwxfHNlYXJjaHw0fHxGYXNoaW9uJTIwc25lYWtlcnMlMjBvciUyMHNob2VzJTIwZGlzcGxheSUyQyUyMHN0eWxpc2glMjBmb290d2VhciUyMGNvbGxlY3Rpb258ZW58MHwyfHx8MTc2NDYxMDc2MHww&ixlib=rb-4.1.0&q=85",
    alt: "Collection Chaussures - Warren Jones on Unsplash"
  }
}

export function HomeContent({ shippingDelay, homepage }: { shippingDelay?: string; homepage?: HomepageConfig }) {
  const hp = homepage ?? DEFAULT_SETTINGS.homepage
  // Bloc 2 (livraison) : le texte automatique "Livraison en X" ne s'affiche
  // QUE si le champ est vide. Sinon, le texte saisi dans l'admin s'affiche tel quel.
  const f2custom = (hp.feature2_text || "").trim()
  const feature2Display =
    f2custom
      ? hp.feature2_text
      : shippingDelay
        ? `Livraison en ${shippingDelay}`
        : DEFAULT_SETTINGS.homepage.feature2_text
  const [latestProducts, setLatestProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupération des produits (Nouveautés) — indépendante des catégories
        let products: Product[] = []
        const pres = await fetch('/api/products')
        if (pres.ok) {
          products = await pres.json()
          setLatestProducts(products.slice(0, 4))
        } else {
          console.warn('[HomeContent] /api/products échec (status ' + pres.status + ')')
        }

        // Récupération des catégories principales (niveau 1 = racines, parent_id NULL)
        // Toujours appelée, indépendamment du statut de /api/products
        
        let names: string[] = []
        const uploadedKeys = hp.category_images && Object.keys(hp.category_images).length > 0
          ? Object.keys(hp.category_images).map((k) => k.trim()).filter(Boolean)
          : []

        if (uploadedKeys.length > 0) {
          // Supprime les doublons en conservant l'ordre
          names = Array.from(new Set(uploadedKeys))
        } else {
          try {
            const cres = await fetch('/api/categories')
            if (cres.ok) {
              const cats = (await cres.json()) as Category[]
              if (Array.isArray(cats)) {
                names = cats.filter((c) => c.parent_id === null || c.parent_id === undefined).map((c) => c.name).filter(Boolean)
              }
            } else {
              console.warn('[HomeContent] /api/categories échec (status ' + cres.status + ')')
            }
          } catch (err) {
            console.error('[HomeContent] Erreur chargement catégories:', err)
          }
          if (names.length === 0) {
            names = Array.from(
              new Set(
                products
                  .map((p: Product) => (typeof p.category === "string" ? p.category.trim() : ""))
                  .filter((c: string) => c.length > 0),
              ),
            ) as string[]
          }
        }
        setCategories(names)
      } catch (error) {
        console.error('[HomeContent] Erreur générale:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, categories.length - 2))
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, categories.length - 2)) % Math.max(1, categories.length - 2))
  }

  const visibleCategories = categories.slice(currentIndex, currentIndex + 3)

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="h-screen md:h-[600px] bg-[var(--color-primary)] text-white flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <Image
              src={hp.hero_image_url || "/luxury-fashion-clothing.jpg"}
              alt="Hero"
              fill
              className="object-cover"
              unoptimized={(hp.hero_image_url || "").startsWith("data:")}
            />
          </div>

          <div className="relative text-center px-4 sm:px-6 lg:px-8 max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">{hp.hero_title}</h1>
            <p className="text-lg md:text-xl text-neutral-300 mb-8 text-balance">
              {hp.hero_subtitle}
            </p>
            <Link
              href="/products"
              className="inline-block bg-white text-neutral-900 px-8 py-3 rounded-lg font-semibold hover:bg-neutral-100 transition"
            >
              {hp.hero_button_text}
            </Link>
          </div>
        </section>

        {/* Collections Section with Carousel */}
        <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">{hp.collections_title}</h2>
            <p className="text-neutral-600 md:text-lg">{hp.collections_subtitle}</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 bg-neutral-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="relative">
              {/* Navigation Buttons */}
              {categories.length > 3 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-neutral-100 transition"
                    aria-label="Catégorie précédente"
                  >
                    <ChevronLeft className="w-6 h-6 text-neutral-900" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-neutral-100 transition"
                    aria-label="Catégorie suivante"
                  >
                    <ChevronRight className="w-6 h-6 text-neutral-900" />
                  </button>
                </>
              )}

              {/* Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {visibleCategories.map((category) => {
                  // Priorité : image uploadée depuis Paramètres > Accueil,
                  // sinon image par défaut en dur, sinon placeholder.
                  const customUrl = (hp.category_images || {})[category]
                  const fallback = categoryImages[category] || {
                    url: "https://picsum.photos/400/600",
                    alt: `Collection ${category}`
                  }
                  const imageData = customUrl
                    ? { url: customUrl, alt: `Collection ${category}` }
                    : fallback
                  
                  return (
                    <Link
                      key={category}
                      href={`/products?category=${category}`}
                      className="group relative overflow-hidden rounded-lg aspect-[3/4] bg-neutral-100"
                    >
                      <Image
                        src={imageData.url}
                        alt={imageData.alt}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized={imageData.url.startsWith("data:")}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h3 className="text-2xl font-bold mb-2">{category}</h3>
                        <p className="text-sm text-neutral-200">Découvrez la collection</p>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Dots Indicator */}
              {categories.length > 3 && (
                <div className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: Math.max(1, categories.length - 2) }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-2 h-2 rounded-full transition ${
                        idx === currentIndex ? "bg-[var(--color-primary)] w-8" : "bg-neutral-300"
                      }`}
                      aria-label={`Aller à la page ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-neutral-600">Aucune catégorie disponible pour le moment.</p>
            </div>
          )}
        </section>

        {/* Nouveautés Section */}
        <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-neutral-50">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">{hp.new_title}</h2>
            <p className="text-neutral-600 md:text-lg">{hp.new_subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {loading
              ? [1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-80 bg-neutral-200 rounded-lg animate-pulse" />
                ))
              : latestProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
          </div>

          <div className="text-center">
            <Link
              href="/products"
              className="inline-block border-2 border-[var(--color-primary)] text-neutral-900 px-8 py-3 rounded-lg font-semibold hover:bg-[var(--color-primary)] hover:text-white transition"
            >
              {hp.new_button_text}
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-white px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--color-primary)] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">✓</span>
              </div>
              <h3 className="font-bold text-lg mb-2">{hp.feature1_title}</h3>
              <p className="text-neutral-600">{hp.feature1_text}</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--color-primary)] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">✓</span>
              </div>
              <h3 className="font-bold text-lg mb-2">{hp.feature2_title}</h3>
              <p className="text-neutral-600">{feature2Display}</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--color-primary)] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">✓</span>
              </div>
              <h3 className="font-bold text-lg mb-2">{hp.feature3_title}</h3>
              <p className="text-neutral-600">{hp.feature3_text}</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}


