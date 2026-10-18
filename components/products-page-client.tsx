"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ProductCard } from "@/components/product-card"
import { SubcategoryFilter } from "@/components/subcategory-filter"
import { Pagination } from "@/components/ui/pagination"
import type { Product } from "@/lib/types"
import { Search, SearchX, Filter, X, AlertCircle, ChevronDown, Check, RotateCcw } from "lucide-react"
import { useCurrency } from "@/components/settings-provider"

interface ProductsPageClientProps {
  initialProducts: Product[]
  initialCategory: string | null
  initialSubcategory: string | null
}

export function ProductsPageClient({
  initialProducts,
  initialCategory,
  initialSubcategory,
}: ProductsPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currency = useCurrency()

  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ---- Tâche 9 : erreur catégories séparée (non bloquante) ----
  // Les produits restent visibles même si l'API catégories échoue :
  // la liste des catégories retombe alors sur celles des produits chargés.
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [apiCategories, setApiCategories] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [priceFilterActive, setPriceFilterActive] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(initialSubcategory)

  const [availabilityFilters, setAvailabilityFilters] = useState<{
    inStock: boolean
    outOfStock: boolean
  }>({
    inStock: false,
    outOfStock: false
  })

  const [sortOption, setSortOption] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showSizeDropdown, setShowSizeDropdown] = useState(false)
  const [showAvailabilityDropdown, setShowAvailabilityDropdown] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const sizeDropdownRef = useRef<HTMLDivElement>(null)
  const availabilityDropdownRef = useRef<HTMLDivElement>(null)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  const closeAllDropdowns = () => {
    setShowCategoryDropdown(false)
    setShowSizeDropdown(false)
    setShowAvailabilityDropdown(false)
    setShowSortDropdown(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const categoryRef = categoryDropdownRef.current
      const sizeRef = sizeDropdownRef.current
      const availabilityRef = availabilityDropdownRef.current
      const sortRef = sortDropdownRef.current

      if (
        categoryRef && !categoryRef.contains(event.target as Node) &&
        sizeRef && !sizeRef.contains(event.target as Node) &&
        availabilityRef && !availabilityRef.contains(event.target as Node) &&
        sortRef && !sortRef.contains(event.target as Node)
      ) {
        closeAllDropdowns()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // ---- Tâche 3 : drawer mobile — verrouiller le scroll + fermer via Escape ----
  useEffect(() => {
    if (!showFilters) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowFilters(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener("keydown", handleEscape)
    }
  }, [showFilters])

  // Initialiser tous les filtres depuis l'URL au chargement
  useEffect(() => {
    const params = searchParams
    setSearchTerm(params.get('q') || '')
    setSelectedSize(params.get('size') || null)
    const min = params.get('min')
    const max = params.get('max')
    if (min !== null && max !== null) {
      setPriceRange([Number(min), Number(max)])
      setPriceFilterActive(true)
    }
    setAvailabilityFilters({
      inStock: params.get('inStock') === '1',
      outOfStock: params.get('outOfStock') === '1'
    })
    setSortOption(params.get('sort') || null)
  }, [])

  // Synchroniser tous les filtres vers l'URL à chaque changement
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('q', searchTerm)
    if (selectedCategory) params.set('category', selectedCategory)
    else params.delete('category')
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory)
    else params.delete('subcategory')
    if (selectedSize) params.set('size', selectedSize)
    if (priceFilterActive) {
      params.set('min', String(priceRange[0]))
      params.set('max', String(priceRange[1]))
      params.set('priceFilter', '1')
    }
    if (availabilityFilters.inStock) params.set('inStock', '1')
    if (availabilityFilters.outOfStock) params.set('outOfStock', '1')
    if (sortOption) params.set('sort', sortOption)

    router.replace(`/products?${params.toString()}`, { scroll: false })
  }, [searchTerm, selectedCategory, selectedSubcategory, selectedSize, priceRange, priceFilterActive, availabilityFilters, sortOption, router])

  // ---- Tâche 9 : charger les catégories depuis l'API en parallèle (non bloquant) ----
  // Si l'API échoue, `categoriesError` est positionné mais les produits
  // restent affichés ; `categories` retombe sur les catégories des produits.
  useEffect(() => {
    let cancelled = false
    fetch("/api/categories")
      .then((res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const names = Array.isArray(data)
          ? data
              .filter((c) => c && (c.parent_id === null || c.parent_id === undefined))
              .map((c) => String(c.name || "").trim())
              .filter((n) => n.length > 0)
          : []
        setApiCategories(names)
        setCategoriesError(null)
      })
      .catch((err) => {
        if (cancelled) return
        console.error("[v0] Error fetching categories:", err)
        setApiCategories([])
        setCategoriesError(
          err instanceof Error ? err.message : "Catégories indisponibles"
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function fetchProducts() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/products")

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}: Impossible de charger les produits`)
      }

      const data = await res.json()

      if (!Array.isArray(data)) {
        throw new Error("Format de données invalide")
      }

      setProducts(data)
      setFilteredProducts(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur inconnue s'est produite"
      console.error("[v0] Error fetching products:", errorMessage)
      setError(errorMessage)
      setProducts([])
      setFilteredProducts([])
    } finally {
      setLoading(false)
    }
  }

  const maxPrice = Math.max(1000, ...products.map((p) => Number(p.price) || 0))

  useEffect(() => {
    let filtered = products

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory)
      if (selectedSubcategory) {
        filtered = filtered.filter(p =>
          p.subcategory && p.subcategory.includes(selectedSubcategory)
        )
      }
    }

    if (selectedSize) {
      filtered = filtered.filter((p) => p.sizes.includes(selectedSize))
    }

    if (priceFilterActive) {
      filtered = filtered.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])
    }

    if (availabilityFilters.inStock || availabilityFilters.outOfStock) {
      filtered = filtered.filter((product) => {
        const totalStock = getTotalStock(product)
        const isInStock = totalStock > 0

        if (availabilityFilters.inStock && !availabilityFilters.outOfStock) {
          return isInStock
        }
        if (!availabilityFilters.inStock && availabilityFilters.outOfStock) {
          return !isInStock
        }
        return true
      })
    }

    filtered = sortProducts(filtered, sortOption)
    setFilteredProducts(filtered)
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, selectedSize, priceRange, priceFilterActive, selectedSubcategory, availabilityFilters, sortOption, products])

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentProducts = filteredProducts.slice(startIndex, endIndex)

  // ---- Tâche 2 : réinitialisation complète des filtres (état + URL) ----
  const handleResetFilters = () => {
    setSearchTerm("")
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setSelectedSize(null)
    setPriceRange([0, 1000])
    setPriceFilterActive(false)
    setAvailabilityFilters({ inStock: false, outOfStock: false })
    setSortOption(null)
    setCurrentPage(1)
    router.replace("/products", { scroll: false })
  }

  // Nombre de filtres actifs (pour le badge / message contextuel de l'empty state)
  const activeFiltersCount =
    (searchTerm ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (selectedSubcategory ? 1 : 0) +
    (selectedSize ? 1 : 0) +
    (priceFilterActive ? 1 : 0) +
    (availabilityFilters.inStock || availabilityFilters.outOfStock ? 1 : 0)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 400, behavior: 'smooth' })
  }

  const getTotalStock = (product: Product): number => {
    if (!product.variants || product.variants.length === 0) return 0
    return product.variants.reduce((total, variant) => total + variant.quantity, 0)
  }

  const sortProducts = (products: Product[], sortOption: string | null): Product[] => {
    if (!sortOption) return products
    const sorted = [...products]
    switch (sortOption) {
      case 'alpha-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'alpha-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name))
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price)
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price)
      case 'date-newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'date-oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      default:
        return sorted
    }
  }

  // ---- Tâche 9 : union API + produits (repli si l'API échoue) ----
  // Priorité aux catégories de l'API ; sinon, celles dérivées des produits.
  const productCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
  const categories = Array.from(new Set([...apiCategories, ...productCategories]))
  const sizes = Array.from(new Set(products.flatMap((p) => p.sizes)))

  const subcategories = selectedCategory
    ? Array.from(new Set(
        products
          .filter((p) => p.category === selectedCategory)
          .flatMap((p) => p.subcategory || [])
      ))
    : []

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-2">Nos Produits</h1>
        {error ? (
          <div className="flex items-center gap-2 text-red-600 mt-4">
            <AlertCircle size={20} />
            <p>{error}</p>
            <button
              onClick={fetchProducts}
              className="ml-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-neutral-900 text-white text-sm font-semibold shadow-sm">
              {filteredProducts.length} produit{filteredProducts.length !== 1 ? "s" : ""} trouvé{filteredProducts.length !== 1 ? "s" : ""}
            </span>
            {activeFiltersCount > 0 && (
              <>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-medium">
                  {activeFiltersCount} filtre{activeFiltersCount > 1 ? "s" : ""} actif{activeFiltersCount > 1 ? "s" : ""}
                </span>
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-300 text-neutral-700 text-xs font-medium hover:bg-neutral-100 transition"
                >
                  <RotateCcw size={13} />
                  Réinitialiser
                </button>
              </>
            )}
            {categoriesError && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                <AlertCircle size={13} />
                Catégories limitées : liste construite depuis les produits affichés
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* ---- Tâche 3 : overlay mobile (fond sombre, clic = fermer) ---- */}
        <div
          onClick={() => setShowFilters(false)}
          aria-hidden="true"
          className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
            showFilters ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />
        {/* ---- Sidebar desktop (inchangée) + Drawer mobile (coulissant) ---- */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtres produits"
          className={`bg-neutral-50 md:bg-neutral-50 md:static md:translate-x-0 md:w-64 md:flex-shrink-0 md:rounded-lg md:z-auto fixed top-0 right-0 h-full w-[85%] max-w-sm z-50 shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out overflow-y-auto ${
            showFilters ? "translate-x-0" : "translate-x-full md:translate-x-0"
          }`}
        >
          <div className="p-6 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Filter size={18} className="md:hidden" />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setShowFilters(false)}
                aria-label="Fermer les filtres"
                className="md:hidden p-1 rounded-full hover:bg-neutral-200 transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 mb-2">Rechercher</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Nom du produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div className="mb-6" ref={categoryDropdownRef}>
              <label className="block text-sm font-semibold text-neutral-900 mb-3">Catégorie</label>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowCategoryDropdown(!showCategoryDropdown)
                    setShowSizeDropdown(false)
                    setShowAvailabilityDropdown(false)
                    setShowSortDropdown(false)
                  }}
                  className={`w-full px-3 py-2 text-left border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50 transition flex items-center justify-between ${
                    showCategoryDropdown ? 'ring-2 ring-neutral-900' : ''
                  }`}
                >
                  <span className="text-sm text-neutral-700">
                    {selectedCategory || 'Toutes les catégories'}
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedCategory(null)
                        setShowCategoryDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-neutral-50 transition ${
                        selectedCategory === null ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700'
                      }`}
                    >
                      Toutes les catégories
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat)
                          setShowCategoryDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-neutral-50 transition ${
                          selectedCategory === cat ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {sizes.length > 0 && (
              <div className="mb-6" ref={sizeDropdownRef}>
                <label className="block text-sm font-semibold text-neutral-900 mb-3">Taille</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowSizeDropdown(!showSizeDropdown)
                      setShowCategoryDropdown(false)
                      setShowAvailabilityDropdown(false)
                      setShowSortDropdown(false)
                    }}
                    className={`w-full px-3 py-2 text-left border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50 transition flex items-center justify-between ${
                      showSizeDropdown ? 'ring-2 ring-neutral-900' : ''
                    }`}
                  >
                    <span className="text-sm text-neutral-700">
                      {selectedSize || 'Toutes les tailles'}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${showSizeDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showSizeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                      <button
                        onClick={() => {
                          setSelectedSize(null)
                          setShowSizeDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-neutral-50 transition ${
                          selectedSize === null ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700'
                        }`}
                      >
                        Toutes les tailles
                      </button>
                      {sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => {
                            setSelectedSize(size)
                            setShowSizeDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-neutral-50 transition ${
                            selectedSize === size ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mb-6" ref={availabilityDropdownRef}>
              <label className="block text-sm font-semibold text-neutral-900 mb-3">Disponibilité</label>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAvailabilityDropdown(!showAvailabilityDropdown)
                    setShowCategoryDropdown(false)
                    setShowSizeDropdown(false)
                    setShowSortDropdown(false)
                  }}
                  className={`w-full px-3 py-2 text-left border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50 transition flex items-center justify-between ${
                    showAvailabilityDropdown ? 'ring-2 ring-neutral-900' : ''
                  }`}
                >
                  <span className="text-sm text-neutral-700">
                    {availabilityFilters.inStock && availabilityFilters.outOfStock ? 'Tous' : availabilityFilters.inStock ? 'En stock' : availabilityFilters.outOfStock ? 'En rupture' : 'Disponibilité'}
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${showAvailabilityDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showAvailabilityDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                    <label className="flex items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={availabilityFilters.inStock}
                        onChange={(e) => setAvailabilityFilters(prev => ({ ...prev, inStock: e.target.checked }))}
                        className="mr-3 h-4 w-4 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-900"
                      />
                      <span className="text-sm text-neutral-700">En stock</span>
                      {availabilityFilters.inStock && <Check size={14} className="ml-auto text-neutral-900" />}
                    </label>
                    <label className="flex items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={availabilityFilters.outOfStock}
                        onChange={(e) => setAvailabilityFilters(prev => ({ ...prev, outOfStock: e.target.checked }))}
                        className="mr-3 h-4 w-4 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-900"
                      />
                      <span className="text-sm text-neutral-700">En rupture de stock</span>
                      {availabilityFilters.outOfStock && <Check size={14} className="ml-auto text-neutral-900" />}
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6" ref={sortDropdownRef}>
              <label className="block text-sm font-semibold text-neutral-900 mb-3">Trier</label>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown)
                    setShowCategoryDropdown(false)
                    setShowSizeDropdown(false)
                    setShowAvailabilityDropdown(false)
                  }}
                  className={`w-full px-3 py-2 text-left border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50 transition flex items-center justify-between ${
                    showSortDropdown ? 'ring-2 ring-neutral-900' : ''
                  }`}
                >
                  <span className="text-sm text-neutral-700">
                    {sortOption === 'alpha-asc' ? 'Alphabétique A-Z' :
                     sortOption === 'alpha-desc' ? 'Alphabétique Z-A' :
                     sortOption === 'price-asc' ? 'Prix faible à élevé' :
                     sortOption === 'price-desc' ? 'Prix élevé à faible' :
                     sortOption === 'date-newest' ? 'Date plus récente' :
                     sortOption === 'date-oldest' ? 'Date plus ancienne' :
                     'Aucun tri spécifique'}
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showSortDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                    <label className="flex items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer">
                      <input
                        type="radio"
                        name="sort"
                        value=""
                        checked={sortOption === null}
                        onChange={() => setSortOption(null)}
                        className="mr-3 h-4 w-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900"
                      />
                      <span className="text-sm text-neutral-700">Aucun tri spécifique</span>
                    </label>
                    <label className="flex items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer">
                      <input
                        type="radio"
                        name="sort"
                        value="alpha-asc"
                        checked={sortOption === 'alpha-asc'}
                        onChange={() => setSortOption('alpha-asc')}
                        className="mr-3 h-4 w-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900"
                      />
                      <span className="text-sm text-neutral-700">Alphabétique A-Z</span>
                    </label>
                    <label className="flex items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer">
                      <input
                        type="radio"
                        name="sort"
                        value="alpha-desc"
                        checked={sortOption === 'alpha-desc'}
                        onChange={() => setSortOption('alpha-desc')}
                        className="mr-3 h-4 w-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900"
                      />
                      <span className="text-sm text-neutral-700">Alphabétique Z-A</span>
                    </label>
                    <label className="flex items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer">
                      <input
                        type="radio"
                        name="sort"
                        value="price-asc"
                        checked={sortOption === 'price-asc'}
                        onChange={() => setSortOption('price-asc')}
                        className="mr-3 h-4 w-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900"
                      />
                      <span className="text-sm text-neutral-700">Prix faible à élevé</span>
                    </label>
                    <label className="flex items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer">
                      <input
                        type="radio"
                        name="sort"
                        value="price-desc"
                        checked={sortOption === 'price-desc'}
                        onChange={() => setSortOption('price-desc')}
                        className="mr-3 h-4 w-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900"
                      />
                      <span className="text-sm text-neutral-700">Prix élevé à faible</span>
                    </label>
                    <label className="flex items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer">
                      <input
                        type="radio"
                        name="sort"
                        value="date-newest"
                        checked={sortOption === 'date-newest'}
                        onChange={() => setSortOption('date-newest')}
                        className="mr-3 h-4 w-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900"
                      />
                      <span className="text-sm text-neutral-700">Date plus récente</span>
                    </label>
                    <label className="flex items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer">
                      <input
                        type="radio"
                        name="sort"
                        value="date-oldest"
                        checked={sortOption === 'date-oldest'}
                        onChange={() => setSortOption('date-oldest')}
                        className="mr-3 h-4 w-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900"
                      />
                      <span className="text-sm text-neutral-700">Date plus ancienne</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-900 mb-3">
                Prix: {priceFilterActive ? priceRange[0] : 0}{currency} - {priceFilterActive ? priceRange[1] : maxPrice}{currency}
              </label>
              <input
                type="range"
                min="0"
                max={maxPrice}
                value={priceFilterActive ? priceRange[1] : maxPrice}
                onChange={(e) => {
                  setPriceFilterActive(true)
                  setPriceRange([priceRange[0], Number.parseInt(e.target.value)])
                }}
                className="w-full"
              />
            </div>

            {/* ---- Tâche 3 : pied de drawer mobile (sticky) ---- */}
            <div className="md:hidden sticky bottom-0 -mx-6 -mb-6 mt-6 p-4 bg-white border-t border-neutral-200 flex gap-3">
              <button
                onClick={handleResetFilters}
                className="flex-1 px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg font-medium hover:bg-neutral-100 transition"
              >
                Réinitialiser
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 px-4 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition"
              >
                Voir {filteredProducts.length} résultat{filteredProducts.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <button
            onClick={() => setShowFilters(true)}
            className="md:hidden mb-6 flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-lg font-medium shadow-sm"
          >
            <Filter size={18} />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="ml-1 min-w-5 h-5 px-1.5 rounded-full bg-white text-neutral-900 text-xs font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {selectedCategory && subcategories.length > 0 && (
            <SubcategoryFilter
              category={selectedCategory}
              subcategories={subcategories}
            />
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(itemsPerPage)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
                  <div className="relative bg-neutral-100 animate-pulse" style={{ aspectRatio: '4/5', minHeight: '320px' }} />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4" />
                    <div className="h-5 bg-neutral-200 rounded animate-pulse w-1/3" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-10 bg-neutral-200 rounded-lg animate-pulse" />
                      <div className="h-10 bg-neutral-200 rounded-lg animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-600" />
              <p className="text-neutral-600 text-lg mb-4">{error}</p>
              <button
                onClick={fetchProducts}
                className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition"
              >
                Réessayer
              </button>
            </div>
          ) : filteredProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                {currentProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={(currentPage - 1) * itemsPerPage + index} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-12">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/60">
              <div className="w-20 h-20 rounded-full bg-white shadow-sm border border-neutral-100 flex items-center justify-center mb-5">
                <SearchX size={36} className="text-neutral-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                Aucun produit trouvé
              </h3>
              <p className="text-neutral-500 mb-2 max-w-md">
                {activeFiltersCount > 0
                  ? `Aucun produit ne correspond à vos ${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}. Essayez d'élargir votre recherche.`
                  : "Aucun produit n'est disponible pour le moment. Revenez bientôt !"}
              </p>
              {(selectedCategory || searchTerm || selectedSize) && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-3 mb-6">
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-white border border-neutral-200 rounded-full text-neutral-700">
                      Catégorie : {selectedCategory}
                    </span>
                  )}
                  {selectedSubcategory && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-white border border-neutral-200 rounded-full text-neutral-700">
                      Sous-catégorie : {selectedSubcategory}
                    </span>
                  )}
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-white border border-neutral-200 rounded-full text-neutral-700">
                      Recherche : &ldquo;{searchTerm}&rdquo;
                    </span>
                  )}
                  {selectedSize && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-white border border-neutral-200 rounded-full text-neutral-700">
                      Taille : {selectedSize}
                    </span>
                  )}
                </div>
              )}
              <div className="flex justify-center mt-4">
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition font-medium"
                >
                  <RotateCcw size={16} />
                  Réinitialiser les filtres
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
