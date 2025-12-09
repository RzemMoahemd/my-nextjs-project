"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { SubcategoryFilter } from "@/components/subcategory-filter"
import { Pagination } from "@/components/ui/pagination"
import type { Product } from "@/lib/types"
import { Search, Filter, X, AlertCircle, ChevronDown, Check } from "lucide-react"

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')
  
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)

  // Nouveaux filtres
  const [availabilityFilters, setAvailabilityFilters] = useState<{
    inStock: boolean
    outOfStock: boolean
  }>({
    inStock: false,
    outOfStock: false
  })

  const [sortOption, setSortOption] = useState<string | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // États pour gérer les dropdowns ouverts/fermés
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showSizeDropdown, setShowSizeDropdown] = useState(false)
  const [showAvailabilityDropdown, setShowAvailabilityDropdown] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  // Refs pour détecter les clics en dehors des dropdowns
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const sizeDropdownRef = useRef<HTMLDivElement>(null)
  const availabilityDropdownRef = useRef<HTMLDivElement>(null)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  // Fermer tous les dropdowns
  const closeAllDropdowns = () => {
    setShowCategoryDropdown(false)
    setShowSizeDropdown(false)
    setShowAvailabilityDropdown(false)
    setShowSortDropdown(false)
  }

  // Event listener pour fermer les dropdowns au clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Vérifier si le clic est en dehors de tous les dropdowns
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

    // Ajouter l'event listener au montage
    document.addEventListener('mousedown', handleClickOutside)

    // Nettoyer au démontage
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam)
    }
  }, [categoryParam])

  useEffect(() => {
    const subcategoryParam = searchParams.get('subcategory')
    setSelectedSubcategory(subcategoryParam)
  }, [searchParams])

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

  useEffect(() => {
    let filtered = products

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory)

      // Subcategory filter
      if (selectedSubcategory) {
        filtered = filtered.filter(p =>
          p.subcategory && p.subcategory.includes(selectedSubcategory)
        )
      }
    }

    // Size filter
    if (selectedSize) {
      filtered = filtered.filter((p) => p.sizes.includes(selectedSize))
    }

    // Price filter
    filtered = filtered.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])

    // Availability filter
    if (availabilityFilters.inStock || availabilityFilters.outOfStock) {
      filtered = filtered.filter((product) => {
        const totalStock = getTotalStock(product)
        const isInStock = totalStock > 0

        // Si seulement "en stock" est coché
        if (availabilityFilters.inStock && !availabilityFilters.outOfStock) {
          return isInStock
        }

        // Si seulement "en rupture" est coché
        if (!availabilityFilters.inStock && availabilityFilters.outOfStock) {
          return !isInStock
        }

        // Si les deux sont cochés, retourner tous les produits
        return true
      })
    }

    // Appliquer le tri
    filtered = sortProducts(filtered, sortOption)

    setFilteredProducts(filtered)
    // Réinitialiser à la page 1 quand les filtres changent
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, selectedSize, priceRange, selectedSubcategory, availabilityFilters, sortOption, products])

  // Calculer les produits à afficher pour la page actuelle
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentProducts = filteredProducts.slice(startIndex, endIndex)

  // Fonction pour changer de page
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll vers le haut de la grille de produits
    window.scrollTo({ top: 400, behavior: 'smooth' })
  }

  // Fonction pour calculer le stock total d'un produit
  const getTotalStock = (product: Product): number => {
    if (!product.variants || product.variants.length === 0) return 0
    return product.variants.reduce((total, variant) => total + variant.quantity, 0)
  }

  // Fonction de tri des produits
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

          const categories = Array.from(new Set(products.map((p) => p.category)))
  const sizes = Array.from(new Set(products.flatMap((p) => p.sizes)))

  // Extract subcategories for the selected category
  const subcategories = selectedCategory
    ? Array.from(new Set(
        products
          .filter((p) => p.category === selectedCategory)
          .flatMap((p) => p.subcategory || [])
      ))
    : []

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
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
              <p className="text-neutral-600">
                {filteredProducts.length} article{filteredProducts.length !== 1 ? "s" : ""} disponible
                {filteredProducts.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Filters Sidebar */}
            <div className={`md:w-64 flex-shrink-0 ${showFilters ? "block" : "hidden md:block"}`}>
              <div className="bg-neutral-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-6 md:hidden">
                  <h2 className="font-bold text-lg">Filtres</h2>
                  <button onClick={() => setShowFilters(false)}>
                    <X size={24} />
                  </button>
                </div>

                {/* Search */}
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

                {/* Category Dropdown Filter */}
                <div className="mb-6" ref={categoryDropdownRef}>
                  <label className="block text-sm font-semibold text-neutral-900 mb-3">Catégorie</label>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowCategoryDropdown(!showCategoryDropdown)
                        // Fermer les autres dropdowns
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

                {/* Size Dropdown Filter */}
                {sizes.length > 0 && (
                  <div className="mb-6" ref={sizeDropdownRef}>
                    <label className="block text-sm font-semibold text-neutral-900 mb-3">Taille</label>
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowSizeDropdown(!showSizeDropdown)
                          // Fermer les autres dropdowns
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

                {/* Availability Filter - Cases à cocher */}
                <div className="mb-6" ref={availabilityDropdownRef}>
                  <label className="block text-sm font-semibold text-neutral-900 mb-3">Disponibilité</label>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowAvailabilityDropdown(!showAvailabilityDropdown)
                        // Fermer les autres dropdowns
                        setShowCategoryDropdown(false)
                        setShowSizeDropdown(false)
                        setShowSortDropdown(false)
                      }}
                      className={`w-full px-3 py-2 text-left border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50 transition flex items-center justify-between ${
                        showAvailabilityDropdown ? 'ring-2 ring-neutral-900' : ''
                      }`}
                    >
                      <span className="text-sm text-neutral-700">
                        {availabilityFilters.inStock && availabilityFilters.outOfStock
                          ? 'En stock et en rupture'
                          : availabilityFilters.inStock
                          ? 'En stock uniquement'
                          : availabilityFilters.outOfStock
                          ? 'En rupture de stock uniquement'
                          : 'Tous les produits'}
                      </span>
                      <ChevronDown size={16} className={`transition-transform ${showAvailabilityDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showAvailabilityDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
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

                {/* Sort Filter - Cases à cocher */}
                <div className="mb-6" ref={sortDropdownRef}>
                  <label className="block text-sm font-semibold text-neutral-900 mb-3">Trier</label>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowSortDropdown(!showSortDropdown)
                        // Fermer les autres dropdowns
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

                {/* Price Filter */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-3">
                    Prix: {priceRange[0]}€ - {priceRange[1]}€
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number.parseInt(e.target.value)])}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden mb-6 flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-lg"
              >
                <Filter size={18} />
                Filtres
              </button>

              {/* Subcategory Filter */}
              {selectedCategory && subcategories.length > 0 && (
                <SubcategoryFilter
                  category={selectedCategory}
                  subcategories={subcategories}
                />
              )}

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-80 bg-neutral-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <AlertCircle size={48} className="mx-auto mb-4 text-red-600" />
                  <p className="text-neutral-600 text-lg mb-4">{error}</p>
                  <button
                    onClick={fetchProducts}
                    className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition"
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

                  {/* Pagination */}
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
                <div className="text-center py-12">
                  <p className="text-neutral-600 text-lg">Aucun produit ne correspond à vos critères.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
