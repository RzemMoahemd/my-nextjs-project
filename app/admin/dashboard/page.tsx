"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import type { Product, User } from "@/lib/types"
import Link from "next/link"
import { LogOut, Plus, Edit, Trash2, AlertTriangle, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Pagination } from "@/components/ui/pagination"

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    priceRange: 'all',
    status: 'all',
    stockStatus: 'all',
    badge: 'all'
  })
  const [sortBy, setSortBy] = useState('recent')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/admin/login")
        return
      }

      // Verify admin access
      const { data: adminUser, error } = await supabase.from("admin_users").select("*").eq("id", user.id).single()

      if (error || !adminUser) {
        await supabase.auth.signOut()
        router.push("/admin/login")
        return
      }

      setUser(user as User)
      fetchProducts()
    } catch (error) {
      console.error("[v0] Auth error:", error)
      router.push("/admin/login")
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products")
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error("[v0] Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  function openDeleteModal(productId: string, productName: string) {
    setProductToDelete({ id: productId, name: productName })
    setDeleteModalOpen(true)
  }

  async function confirmDelete() {
    if (!productToDelete) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/products/${productToDelete.id}/delete`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete product")

      setDeleteModalOpen(false)
      setProductToDelete(null)
      fetchProducts()
    } catch (error) {
      console.error("[v0] Delete error:", error)
      alert("Erreur lors de la suppression du produit.")
    } finally {
      setIsDeleting(false)
    }
  }

  function cancelDelete() {
    setDeleteModalOpen(false)
    setProductToDelete(null)
  }

  async function toggleProductActive(productId: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/products/${productId}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (!res.ok) throw new Error("Failed to toggle active status")

      fetchProducts()
    } catch (error) {
      console.error("[v0] Toggle active error:", error)
      alert("Erreur lors de la mise à jour du statut.")
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900" />
      </div>
    )
  }

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(products.map(p => p.category))).sort()

  // Prendre le prix promotionnel en compte si disponible
  const getEffectivePrice = (product: Product) => product.promotional_price ?? product.price

  // Helper functions for product info
  const getTotalStock = (product: Product) => {
    return product.variants?.reduce((sum, v) => sum + v.quantity, 0) ?? 0
  }

  const getVariantsCount = (product: Product) => {
    return product.variants?.length ?? 0
  }

  const getVariantsInfo = (product: Product) => {
    if (!product.sizes?.length && !product.colors?.length) return 'Aucune variante'
    const sizesCount = product.sizes?.length ?? 0
    const colorsCount = product.colors?.length ?? 0
    if (sizesCount > 0 && colorsCount > 0) {
      return `${sizesCount} tailles, ${colorsCount} couleurs`
    } else if (sizesCount > 0) {
      return `${sizesCount} tailles`
    } else if (colorsCount > 0) {
      return `${colorsCount} couleurs`
    }
    return `${getVariantsCount(product)} variantes`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStockStatus = (totalStock: number) => {
    const lowStockThreshold = 5 // Seuil configurable
    if (totalStock === 0) {
      return { text: 'Rupture', color: 'text-red-600', icon: '❌' }
    } else if (totalStock <= lowStockThreshold) {
      return { text: `${totalStock}`, color: 'text-orange-600', icon: '⚠' }
    }
    return { text: `${totalStock}`, color: 'text-green-600', icon: '' }
  }

  // Filter products based on active filters
  const filteredProducts = products.filter(product => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const nameMatch = product.name.toLowerCase().includes(searchLower)
      const categoryMatch = product.category.toLowerCase().includes(searchLower)
      const subcategoryMatch = Array.isArray(product.subcategory) &&
        product.subcategory.some(sub =>
          typeof sub === 'string' && sub.toLowerCase().includes(searchLower)
        )
      if (!nameMatch && !categoryMatch && !subcategoryMatch) {
        return false
      }
    }

    // Category filter
    if (filters.category !== 'all' && product.category !== filters.category) {
      return false
    }

    // Price range filter
    if (filters.priceRange !== 'all') {
      const price = getEffectivePrice(product)
      switch (filters.priceRange) {
        case '0-50':
          if (price > 50) return false
          break
        case '51-100':
          if (price <= 50 || price > 100) return false
          break
        case '101-200':
          if (price <= 100 || price > 200) return false
          break
        case '200+':
          if (price <= 200) return false
          break
      }
    }

    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'active' && !product.is_active) return false
      if (filters.status === 'inactive' && product.is_active) return false
    }

    // Stock filter
    if (filters.stockStatus !== 'all') {
      const totalStock = getTotalStock(product)
      switch (filters.stockStatus) {
        case 'in_stock':
          if (totalStock <= 0) return false
          break
        case 'low_stock':
          const lowStockThreshold = 5
          if (totalStock <= 0 || totalStock > lowStockThreshold) return false
          break
        case 'out_of_stock':
          if (totalStock > 0) return false
          break
      }
    }

    // Badge filter
    if (filters.badge !== 'all') {
      if (filters.badge === 'none') {
        if (product.badge) return false
      } else if (product.badge !== filters.badge) {
        return false
      }
    }

    return true
  })

  // Apply sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'price_low':
        return getEffectivePrice(a) - getEffectivePrice(b)
      case 'price_high':
        return getEffectivePrice(b) - getEffectivePrice(a)
      case 'stock_first':
        return getTotalStock(b) - getTotalStock(a)
      default:
        return 0
    }
  })

  const activeCount = products.filter((p) => p.is_active).length
  const inactiveCount = products.length - activeCount

  // Pagination calculations
  const itemsPerPage = 20
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">ELEGANCE Admin</h1>
            <p className="text-neutral-600 text-sm">Connecté en tant que {user.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border border-neutral-200">
            <p className="text-neutral-600 text-sm font-medium mb-2">Total de produits</p>
            <p className="text-4xl font-bold text-neutral-900">{products.length}</p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-neutral-200">
            <p className="text-neutral-600 text-sm font-medium mb-2">Produits actifs</p>
            <p className="text-4xl font-bold text-green-600">{activeCount}</p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-neutral-200">
            <p className="text-neutral-600 text-sm font-medium mb-2">Produits désactivés</p>
            <p className="text-4xl font-bold text-red-600">{inactiveCount}</p>
          </div>
        </div>

        {/* Actions - Sticky Header */}
        <div className="sticky top-0 z-20 bg-neutral-50/95 backdrop-blur-sm border-y border-neutral-200 py-4 mb-8 shadow-sm">
          <div className="flex flex-wrap gap-4">
            <Link
              href="/admin/products/new"
              className="flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-neutral-800 transition"
            >
              <Plus size={20} />
              Ajouter un produit
            </Link>
            <Link
              href="/admin/orders"
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              📋 Gérer les commandes
            </Link>
            <Link
              href="/admin/categories"
              className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
            >
              🏷️ Gérer les catégories
            </Link>
            <Link
              href="/admin/coupons"
              className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
            >
              🎫 Codes promo
            </Link>
          </div>
        </div>

        {/* Filters & Search */}
        {!loading && products.length > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">

            <div className="grid grid-cols-1 lg:grid-cols-8 gap-4 mb-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Recherche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Nom, catégorie..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Catégorie</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Price Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Prix</label>
                <select
                  value={filters.priceRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
                >
                  <option value="all">Tous</option>
                  <option value="0-50">0-50 DT</option>
                  <option value="51-100">51-100 DT</option>
                  <option value="101-200">101-200 DT</option>
                  <option value="200+">200+ DT</option>
                </select>
              </div>

              {/* Stock Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Stock</label>
                <select
                  value={filters.stockStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, stockStatus: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
                >
                  <option value="all">Tous</option>
                  <option value="in_stock">En stock</option>
                  <option value="low_stock">Stock faible</option>
                  <option value="out_of_stock">Rupture</option>
                </select>
              </div>

              {/* Badge Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Badge</label>
                <select
                  value={filters.badge}
                  onChange={(e) => setFilters(prev => ({ ...prev, badge: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
                >
                  <option value="all">Tous</option>
                  <option value="new">Nouveau</option>
                  <option value="top_sale">Top vente</option>
                  <option value="promo">Promo</option>
                  <option value="none">Aucun</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
                >
                  <option value="all">Tous</option>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Trier par</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
                >
                  <option value="recent">Plus récents</option>
                  <option value="price_low">Prix croissant</option>
                  <option value="price_high">Prix décroissant</option>
                  <option value="stock_first">En stock d'abord</option>
                </select>
              </div>
            </div>

            {/* Active filters and clear button */}
            {(filters.search || filters.category !== 'all' || filters.priceRange !== 'all' || filters.status !== 'all' || filters.stockStatus !== 'all' || filters.badge !== 'all') && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-600">
                    {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => setFilters({ search: '', category: 'all', priceRange: 'all', status: 'all', stockStatus: 'all', badge: 'all' })}
                  className="px-3 py-1 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        )}

        {/* Products List */}
        <div className="bg-white rounded-lg border border-neutral-200">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">
              Gestion des produits
              {filteredProducts.length !== products.length && (
                <span className="text-neutral-500 text-sm font-normal ml-2">
                  ({filteredProducts.length} sur {products.length})
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-neutral-600">Chargement...</div>
          ) : products.length === 0 ? (
            <div className="p-6 text-center text-neutral-600">
              Aucun produit.{" "}
              <Link href="/admin/products/new" className="text-neutral-900 font-semibold hover:underline">
                Créer le premier
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">Produit</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">Catégorie</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">Prix</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-neutral-900">Stock</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">Variantes</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">SKU</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">Badge</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">Statut</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product, index) => (
                    <tr key={product.id} className={`border-b border-gray-100 hover:bg-neutral-50 transition ${
                      index % 2 === 1 ? 'bg-gray-50/50' : ''
                    }`}>
                      <td className="px-8 py-6 text-sm text-neutral-900 font-medium">
                        <div className="min-h-[52px]">
                          <div className="flex items-center gap-3 mb-1">
                            {product.images.length > 0 && (
                              <img
                                src={product.images[0] || "/placeholder.svg"}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded flex-shrink-0"
                              />
                            )}
                            <span className="line-clamp-1">{product.name}</span>
                          </div>
                          <div className="text-xs text-neutral-500 ml-[52px]">
                            Ajouté le {formatDate(product.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm text-neutral-600">
                        {product.category}
                        {product.subcategory && (
                          <span className="text-neutral-400"> / {
                            Array.isArray(product.subcategory)
                              ? product.subcategory.join(', ')
                              : product.subcategory
                          }</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-sm font-semibold text-neutral-900">{product.price.toFixed(2)} DT</td>
                      <td className="px-8 py-6 text-center text-sm">
                        {(() => {
                          const stockStatus = getStockStatus(getTotalStock(product))
                          return (
                            <span className={`${stockStatus.color} font-medium`}>
                              {stockStatus.icon} {stockStatus.text}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-8 py-6 text-sm text-neutral-600">
                        {getVariantsInfo(product)}
                      </td>
                      <td className="px-8 py-6 text-sm font-mono text-neutral-600">
                        {product.sku || '-'}
                      </td>
                      <td className="px-8 py-6 text-sm">
                        {product.badge && (
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              product.badge === "new"
                                ? "bg-blue-100 text-blue-800"
                                : product.badge === "top_sale"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {product.badge === "new" ? "Nouveau" : product.badge === "top_sale" ? "Top vente" : "Promo"}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-sm">
                        <button
                          onClick={() => toggleProductActive(product.id, product.is_active)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                            product.is_active
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          {product.is_active ? "✓ Actif" : "✗ Désactivé"}
                        </button>
                      </td>
                      <td className="px-8 py-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="p-2 text-blue-600 hover:text-blue-700 transition rounded-lg hover:bg-blue-50"
                            title="Modifier le produit"
                          >
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() => openDeleteModal(product.id, product.name)}
                            className="p-2 text-red-600 hover:text-red-700 transition rounded-lg hover:bg-red-50"
                            title="Supprimer le produit"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="mt-0"
            />
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Confirmer la suppression
              </DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer le produit <strong>"{productToDelete?.name}"</strong> ?
                Cette action est <strong>irréversible</strong> et supprimera définitivement le produit
                ainsi que toutes les données associées.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Supprimant...
                  </>
                ) : (
                  'Supprimer définitivement'
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
