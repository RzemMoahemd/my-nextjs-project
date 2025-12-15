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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    priceRange: "all",
    status: "all",
    stockStatus: "all",
    badge: "all",
  })
  const [sortBy, setSortBy] = useState("recent")
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("id", user.id)
        .single()

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
  const categories = Array.from(new Set(products.map((p) => p.category))).sort()

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
    if (!product.sizes?.length && !product.colors?.length) return "Aucune variante"
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
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getStockStatus = (totalStock: number) => {
    const lowStockThreshold = 5
    if (totalStock === 0) {
      return { text: "Rupture", color: "text-red-600", icon: "❌" }
    } else if (totalStock <= lowStockThreshold) {
      return { text: `${totalStock}`, color: "text-orange-600", icon: "⚠" }
    }
    return { text: `${totalStock}`, color: "text-green-600", icon: "" }
  }

  // Filter products based on active filters
  const filteredProducts = products.filter((product) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const nameMatch = product.name.toLowerCase().includes(searchLower)
      const categoryMatch = product.category.toLowerCase().includes(searchLower)
      const subcategoryMatch = (() => {
        // Vérification de subcategory
        if (Array.isArray(product.subcategory)) {
          if (product.subcategory.some((sub: any) => typeof sub === "string" && sub.toLowerCase().includes(searchLower))) {
            return true
          }
        } else if (typeof product.subcategory === "string" && product.subcategory.toLowerCase().includes(searchLower)) {
          return true
        }

        // Vérification de subsubcategory avec type assertion
        const subsubcategory = (product as any).subsubcategory
        if (typeof subsubcategory === "string" && subsubcategory.toLowerCase().includes(searchLower)) {
          return true
        }

        return false
      })()
      if (!nameMatch && !categoryMatch && !subcategoryMatch) {
        return false
      }
    }

    // Category filter
    if (filters.category !== "all" && product.category !== filters.category) {
      return false
    }

    // Price range filter
    if (filters.priceRange !== "all") {
      const price = getEffectivePrice(product)
      switch (filters.priceRange) {
        case "0-50":
          if (price > 50) return false
          break
        case "51-100":
          if (price <= 50 || price > 100) return false
          break
        case "101-200":
          if (price <= 100 || price > 200) return false
          break
        case "200+":
          if (price <= 200) return false
          break
      }
    }

    // Status filter
    if (filters.status !== "all") {
      if (filters.status === "active" && !product.is_active) return false
      if (filters.status === "inactive" && product.is_active) return false
    }

    // Stock filter
    if (filters.stockStatus !== "all") {
      const totalStock = getTotalStock(product)
      switch (filters.stockStatus) {
        case "in_stock":
          if (totalStock <= 0) return false
          break
        case "low_stock":
          const lowStockThreshold = 5
          if (totalStock <= 0 || totalStock > lowStockThreshold) return false
          break
        case "out_of_stock":
          if (totalStock > 0) return false
          break
      }
    }

    // Badge filter
    if (filters.badge !== "all") {
      if (filters.badge === "none") {
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
      case "recent":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case "price_low":
        return getEffectivePrice(a) - getEffectivePrice(b)
      case "price_high":
        return getEffectivePrice(b) - getEffectivePrice(a)
      case "stock_first":
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
    <div className="relative min-h-screen bg-neutral-50">
      {/* Collapsible Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full z-30 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarCollapsed ? "w-20" : "w-80"
        }`}
      >
        <div className="relative h-full bg-white/80 backdrop-blur-xl border-r border-neutral-200/60 shadow-sm rounded-r-3xl overflow-visible flex flex-col">
          {/* Sidebar Header - Fixed Top */}
          <div className="bg-white border-b border-neutral-200/50 px-5 py-4 shadow-sm rounded-r-3xl flex-shrink-0 relative">
            <div className="flex items-center justify-center">
              {!sidebarCollapsed ? (
                <div className="flex items-center gap-3 w-full">
                  {/* Logo */}
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-white font-bold text-sm">E</span>
                  </div>
                  {/* App Info */}
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-neutral-900 leading-tight">ELEGANCE</h3>
                    <p className="text-[10px] text-neutral-600 font-medium">Dashboard Admin</p>
                  </div>
                </div>
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">E</span>
                </div>
              )}
            </div>

            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-[999] w-9 h-7 bg-white border border-neutral-200 shadow-md hover:shadow-lg hover:bg-neutral-50 rounded-2xl flex items-center justify-center transition-all duration-200 ease-out"
              aria-label={sidebarCollapsed ? "Ouvrir le panneau" : "Fermer le panneau"}
            >
              <svg
                className={`w-3.5 h-3.5 text-neutral-900 transition-transform duration-200 ${
                  sidebarCollapsed ? "" : "rotate-180"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="flex flex-col min-h-full px-5 pt-8 pb-6 gap-6">
              {/* Header Info */}
              <div className="flex-shrink-0 space-y-1">
                <p className="text-xs font-semibold tracking-[0.18em] text-neutral-400 uppercase">
                  Admin Panel
                </p>
                <p className="text-sm font-medium text-neutral-900 truncate">{user.email}</p>
              </div>

              {/* Quick Actions Menu */}
              <div className="flex-shrink-0">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-neutral-400 uppercase mb-3">
                  Actions rapides
                </p>
                <div className="space-y-2">
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-3 p-3 bg-neutral-50/80 hover:bg-neutral-100 rounded-xl transition-colors border border-neutral-200/80 hover:border-neutral-300"
                  >
                    <span className="text-xl flex-shrink-0">⚙️</span>
                    <span className="text-sm font-medium text-neutral-800">Paramètres</span>
                  </Link>

                  <Link
                    href="/account"
                    className="flex items-center gap-3 p-3 bg-neutral-50/80 hover:bg-neutral-100 rounded-xl transition-colors border border-neutral-200/80 hover:border-neutral-300"
                  >
                    <span className="text-xl flex-shrink-0">👤</span>
                    <span className="text-sm font-medium text-neutral-800">Mon compte</span>
                  </Link>

                  <Link
                    href="?status=pending"
                    className="flex items-center gap-3 p-3 bg-neutral-50/80 hover:bg-orange-50 rounded-xl transition-colors border border-neutral-200/80 hover:border-orange-300 hover:text-orange-700"
                  >
                    <span className="text-xl flex-shrink-0">🧾</span>
                    <span className="text-sm font-medium text-neutral-800">Cmd. attente</span>
                  </Link>

                  <Link
                    href="/admin/notifications"
                    className="flex items-center gap-3 p-3 bg-neutral-50/80 hover:bg-blue-50 rounded-xl transition-colors border border-neutral-200/80 hover:border-blue-300 hover:text-blue-700"
                  >
                    <span className="text-xl flex-shrink-0">🔔</span>
                    <span className="text-sm font-medium text-neutral-800">Notifications</span>
                  </Link>
                </div>
              </div>

              {/* Logout Button */}
              <div className="flex-grow flex items-end">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200/80 hover:border-red-300"
                >
                  <LogOut size={20} className="flex-shrink-0" />
                  <span className="text-sm font-medium">Déconnexion</span>
                </button>
              </div>
            </div>
          )}

          {sidebarCollapsed && (
            <div className="flex flex-col h-full items-center justify-between py-8 pb-6">
              <div className="flex flex-col gap-3">
                <Link
                  href="/admin/settings"
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300 transition-colors"
                  title="Paramètres"
                >
                  <span className="text-lg">⚙️</span>
                </Link>

                <Link
                  href="/account"
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300 transition-colors"
                  title="Mon compte"
                >
                  <span className="text-lg">👤</span>
                </Link>

                <Link
                  href="?status=pending"
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 transition-colors"
                  title="Commandes en attente"
                >
                  <span className="text-lg">🧾</span>
                </Link>

                <Link
                  href="/admin/notifications"
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-colors"
                  title="Notifications"
                >
                  <span className="text-lg">🔔</span>
                </Link>

                <button
                  onClick={() => setFilters((prev) => ({ ...prev, stockStatus: "out_of_stock" }))}
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 transition-colors"
                  title="Produits en rupture"
                >
                  <span className="text-lg">📦</span>
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center rounded-2xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                title="Déconnexion"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Header with dynamic margin */}
      <header
        className={`bg-white border-b border-neutral-200 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarCollapsed ? "ml-20" : "ml-80"
        }`}
      >
        <div className={`${sidebarCollapsed ? "pl-6" : "pl-4"} pr-8 py-6 flex justify-between items-center`}>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">ELEGANCE Admin</h1>
            <p className="text-neutral-600 text-sm">Tableau de bord principal</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600">Connecté en tant que {user.email}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`flex-1 p-8 bg-neutral-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarCollapsed ? "ml-20" : "ml-80"
        }`}
      >
        {/* Stats Row */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-6 mb-8">
          <div className="bg-white rounded-xl p-3 border border-neutral-200 flex items-center gap-3 flex-1 shadow-sm">
            <div className="text-2xl">📦</div>
            <div className="flex-1">
              <p className="text-gray-500 text-xs font-medium">Total de produits</p>
              <p className="text-3xl font-bold text-neutral-900">{products.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-neutral-200 flex items-center gap-3 flex-1 shadow-sm">
            <div className="text-2xl">🟢</div>
            <div className="flex-1">
              <p className="text-gray-500 text-xs font-medium">Produits actifs</p>
              <p className="text-3xl font-bold text-green-600">{activeCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-neutral-200 flex items-center gap-3 flex-1 shadow-sm">
            <div className="text-2xl">🔴</div>
            <div className="flex-1">
              <p className="text-gray-500 text-xs font-medium">Produits désactivés</p>
              <p className="text-3xl font-bold text-red-600">{inactiveCount}</p>
            </div>
          </div>
        </div>

        {/* Actions - Compact Enhanced Sticky Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-neutral-50 to-neutral-100/95 backdrop-blur-sm border-y border-neutral-200/50 py-3 mb-6 shadow-lg">
          <div className="max-w-5xl mx-auto px-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl md:max-w-5xl">
              {/* Add Product - Primary Action */}
              <Link
                href="/admin/products/new"
                className="group relative flex flex-col items-center gap-1.5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-2.5 rounded-lg font-semibold text-xs md:text-sm hover:from-emerald-400 hover:to-emerald-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shadow-sm"
              >
                <Plus size={20} className="md:w-4 md:h-4" />
                <span className="text-center leading-tight text-xs md:text-xs">
                  Ajouter un
                  <br />
                  produit
                </span>
                <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </Link>

              {/* Orders Management */}
              <Link
                href="/admin/orders"
                className="group relative flex flex-col items-center gap-1.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white p-2.5 rounded-lg font-semibold text-xs md:text-sm hover:from-blue-400 hover:to-blue-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shadow-sm"
              >
                <span className="text-lg md:text-lg">📋</span>
                <span className="text-center leading-tight text-xs md:text-xs">
                  Gérer les
                  <br />
                  commandes
                </span>
                <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </Link>

              {/* Categories Management */}
              <Link
                href="/admin/categories"
                className="group relative flex flex-col items-center gap-1.5 bg-gradient-to-br from-purple-500 to-purple-600 text-white p-2.5 rounded-lg font-semibold text-xs md:text-sm hover:from-purple-400 hover:to-purple-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shadow-sm"
              >
                <span className="text-lg md:text-lg">🏷️</span>
                <span className="text-center leading-tight text-xs md:text-xs">
                  Gérer les
                  <br />
                  catégories
                </span>
                <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </Link>

              {/* Coupons & Promo */}
              <Link
                href="/admin/coupons"
                className="group relative flex flex-col items-center gap-1.5 bg-gradient-to-br from-amber-500 to-orange-500 text-white p-2.5 rounded-lg font-semibold text-xs md:text-sm hover:from-amber-400 hover:to-orange-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shadow-sm"
              >
                <span className="text-lg md:text-lg">🎫</span>
                <span className="text-center leading-tight text-xs md:text-xs">
                  Codes
                  <br />
                  promo
                </span>
                <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </Link>
            </div>
          </div>
        </div>

        {/* Filters & Search - Sticky on Desktop */}
        {!loading && products.length > 0 && (
          <div className="md:sticky md:top-16 md:z-10 bg-white rounded-xl border border-neutral-200 p-6 mb-6 md:bg-white/95 md:backdrop-blur-sm md:shadow-sm">
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
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Catégorie</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Prix</label>
                <select
                  value={filters.priceRange}
                  onChange={(e) => setFilters((prev) => ({ ...prev, priceRange: e.target.value }))}
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
                  onChange={(e) => setFilters((prev) => ({ ...prev, stockStatus: e.target.value }))}
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
                  onChange={(e) => setFilters((prev) => ({ ...prev, badge: e.target.value }))}
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
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
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
                  <option value="stock_first">En stock d&apos;abord</option>
                </select>
              </div>
            </div>

            {(filters.search ||
              filters.category !== "all" ||
              filters.priceRange !== "all" ||
              filters.status !== "all" ||
              filters.stockStatus !== "all" ||
              filters.badge !== "all") && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-600">
                    {filteredProducts.length} produit
                    {filteredProducts.length > 1 ? "s" : ""} trouvé
                    {filteredProducts.length > 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setFilters({
                      search: "",
                      category: "all",
                      priceRange: "all",
                      status: "all",
                      stockStatus: "all",
                      badge: "all",
                    })
                  }
                  className="px-3 py-1 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        )}

        {/* Products List */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
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
                    <tr
                      key={product.id}
                      className={`border-b border-gray-100 hover:bg-neutral-50 transition ${
                        index % 2 === 1 ? "bg-gray-50/50" : ""
                      }`}
                    >
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
                        {/* Hiérarchie complète avec chevrons élégants */}
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-neutral-900">{product.category || 'N/A'}</span>
                          {product.subcategory && product.subcategory.length > 0 && (
                            <>
                              <span className="text-neutral-400 mx-1">›</span>
                              <span className="text-neutral-700">
                                {Array.isArray(product.subcategory) ? product.subcategory.join(", ") : product.subcategory}
                              </span>
                            </>
                          )}
                          {product.subsubcategory && product.subsubcategory.trim() !== '' && (
                            <>
                              <span className="text-neutral-400 mx-1">›</span>
                              <span className="text-neutral-600 font-medium">{product.subsubcategory}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-semibold text-neutral-900">
                        {product.price.toFixed(2)} DT
                      </td>
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
                      <td className="px-8 py-6 text-sm text-neutral-600">{getVariantsInfo(product)}</td>
                      <td className="px-8 py-6 text-sm font-mono text-neutral-600">{product.sku || "-"}</td>
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
                            {product.badge === "new"
                              ? "Nouveau"
                              : product.badge === "top_sale"
                              ? "Top vente"
                              : "Promo"}
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
                Êtes-vous sûr de vouloir supprimer le produit <strong>"{productToDelete?.name}"</strong> ? Cette action
                est <strong>irréversible</strong> et supprimera définitivement le produit ainsi que toutes les données
                associées.
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
                  "Supprimer définitivement"
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
