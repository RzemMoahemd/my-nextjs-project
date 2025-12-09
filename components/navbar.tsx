"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Menu, ShoppingBag, X, User, LogOut, ChevronDown } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { createClientComponentClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showProductsDropdown, setShowProductsDropdown] = useState(false)
  const [dropdownHeight, setDropdownHeight] = useState(0)
  const [dropdownData, setDropdownData] = useState<{
    categories: any[]
    recentProducts: any[]
  }>({
    categories: [],
    recentProducts: []
  })
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null)
  const { itemCount, clearCart } = useCart()
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error("Erreur vérification utilisateur:", error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  // Charger les données du dropdown produits au hover
  const loadProductsDropdown = async () => {
    try {
      const response = await fetch("/api/navigation/products")
      if (response.ok) {
        const data = await response.json()
        setDropdownData(data)
      }
    } catch (error) {
      console.error("Erreur chargement dropdown produits:", error)
    }
  }

  const handleProductsHover = () => {
    if (!showProductsDropdown) {
      setShowProductsDropdown(true)
      loadProductsDropdown()
    }
  }

  const [navbarTop, setNavbarTop] = useState(64) // Hauteur par défaut

  useEffect(() => {
    // Calculer la position réelle du navbar au premier rendu
    const updateNavbarPosition = () => {
      const navbar = document.querySelector('nav')
      if (navbar) {
        const rect = navbar.getBoundingClientRect()
        const top = rect.bottom // Position du bas du navbar
        setNavbarTop(top)
      }
    }

    updateNavbarPosition()

    // Recalculer si la fenêtre change de taille
    const handleResize = () => updateNavbarPosition()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleProductsLeave = () => {
    // Délai pour permettre la navigation vers le dropdown
    const timeout = setTimeout(() => {
      setShowProductsDropdown(false)
      setDropdownTimeout(null)
    }, 150)
    setDropdownTimeout(timeout)
  }

  const handleDropdownEnter = () => {
    // Annuler la fermeture si on entre dans le dropdown
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout)
      setDropdownTimeout(null)
    }
  }

  async function handleSignOut() {
    await clearCart()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="font-bold text-xl text-neutral-900">
            ELEGANCE
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-8 relative">
            <Link href="/" className="text-neutral-700 hover:text-neutral-900 transition">
              Accueil
            </Link>

            {/* Produits avec dropdown au hover */}
            <div
              className="relative"
              onMouseEnter={handleProductsHover}
              onMouseLeave={handleProductsLeave}
            >
              <Link href="/products" className="text-neutral-700 hover:text-neutral-900 transition">
                Produits
              </Link>

              {/* FULL-WIDTH HORIZONTAL DROPDOWN - COMME AU DEBUT */}
              {showProductsDropdown && (
                <div
                  className="fixed left-0 right-0 bg-white border-t border-neutral-200 shadow-lg z-50"
                  style={{
                    top: '64px', // Sous le navbar (64px hauteur navbar)
                    height: '400px' // Hauteur complète
                  }}
                  onMouseEnter={handleDropdownEnter}
                >
                  <div className="max-w-7xl mx-auto h-full flex">
                    {/* Categories - Gauche */}
                    <div className="w-1/3 border-r border-neutral-200 p-6 overflow-y-auto">
                      <h3 className="text-sm font-semibold text-neutral-900 mb-4 uppercase tracking-wide">
                        Catégories
                      </h3>
                      <div className="space-y-2">
                        {dropdownData.categories.map((category) => (
                          <Link
                            key={category.id}
                            href={`/products?category=${encodeURIComponent(category.name)}`}
                            className="block py-3 px-4 text-sm text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition"
                            onClick={() => setShowProductsDropdown(false)}
                          >
                            {category.name}
                          </Link>
                        ))}
                        {dropdownData.categories.length === 0 && (
                          <p className="text-sm text-neutral-500 text-center py-8">
                            Aucune catégorie créée
                          </p>
                        )}
                        <Link
                          href="/products"
                          className="block py-3 px-4 text-sm text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg font-medium transition mt-4 border-t border-neutral-100"
                          onClick={() => setShowProductsDropdown(false)}
                        >
                          Toutes nos catégories
                        </Link>
                      </div>
                    </div>

                    {/* Produits - Droite */}
                    <div className="w-2/3 p-6 overflow-y-auto">
                      <h3 className="text-sm font-semibold text-neutral-900 mb-4 uppercase tracking-wide">
                        Nouveautés
                      </h3>
                      {dropdownData.recentProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 h-full overflow-y-auto">
                          {dropdownData.recentProducts.map((product) => (
                            <Link
                              key={product.id}
                              href={`/products/${product.id}`}
                              className="flex flex-col p-4 border border-neutral-200 rounded-lg hover:shadow-md transition group"
                              onClick={() => setShowProductsDropdown(false)}
                            >
                              <div className="aspect-square mb-3 bg-neutral-100 rounded flex items-center justify-center overflow-hidden">
                                {product.images && product.images.length > 0 ? (
                                  <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-neutral-400 text-xs">Aucune image</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-neutral-900 mb-1 line-clamp-2">
                                  {product.name}
                                </h4>
                                <p className="text-sm text-neutral-600">
                                  {product.promotional_price ? (
                                    <span className="flex items-center gap-2">
                                      <span className="line-through text-neutral-400">
                                        {product.price} DT
                                      </span>
                                      <span className="font-medium text-red-600">
                                        {product.promotional_price} DT
                                      </span>
                                    </span>
                                  ) : (
                                    <span>{product.price} DT</span>
                                  )}
                                </p>
                                {product.badge && (
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    product.badge === 'new' ? 'bg-blue-100 text-blue-800' :
                                    product.badge === 'top_sale' ? 'bg-green-100 text-green-800' :
                                    'bg-neutral-100 text-neutral-800'
                                  }`}>
                                    {product.badge === 'new' ? 'Nouveau' :
                                     product.badge === 'top_sale' ? 'Top vente' :
                                     product.badge}
                                  </span>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-neutral-500 text-center">
                            Aucune nouveauté disponible
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link href="/contact" className="text-neutral-700 hover:text-neutral-900 transition">
              Contact
            </Link>
          </div>

          {/* User Account + Cart + Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* User Account */}
            {!loading && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 p-2 rounded-full hover:bg-neutral-100 transition"
                  >
                    <User size={20} />
                    <span className="hidden sm:inline text-sm text-neutral-700">
                      {user.email?.split('@')[0]}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                      <Link
                        href="/account"
                        className="block px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 border-b border-neutral-100"
                      >
                        Mon compte
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden sm:inline text-neutral-700 hover:text-neutral-900 text-sm transition"
                >
                  Connexion
                </Link>
              )
            )}

            <Link href="/cart" className="relative p-2 rounded-full hover:bg-neutral-100 transition">
              <ShoppingBag size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            <Link href="/admin" className="hidden lg:inline text-neutral-700 hover:text-neutral-900 text-sm transition">
              Admin
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2"
              disabled={!!user} // Désactiver le menu mobile si utilisateur connecté
            >
              {!user && (isOpen ? <X size={24} /> : <Menu size={24} />)}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-neutral-200">
            <Link href="/" className="block py-2 text-neutral-700 hover:text-neutral-900 transition">
              Accueil
            </Link>
            <Link href="/products" className="block py-2 text-neutral-700 hover:text-neutral-900 transition">
              Produits
            </Link>
            <Link href="/contact" className="block py-2 text-neutral-700 hover:text-neutral-900 transition">
              Contact
            </Link>
            <Link href="/cart" className="block py-2 text-neutral-700 hover:text-neutral-900 transition">
              Panier
            </Link>
            <Link href="/admin" className="block py-2 text-neutral-700 hover:text-neutral-900 transition">
              Admin
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
