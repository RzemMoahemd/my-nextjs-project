"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClientComponentClient } from "@/lib/supabase-client"
import type { Order } from "@/lib/types"
import { useCart } from "@/components/cart-provider"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProfileForm } from "@/components/profile-form"
import { useToast } from "@/hooks/use-toast"
import { useFavorites } from "@/hooks/use-favorites"
import {
  User,
  Package,
  LogOut,
  ShoppingBag,
  CreditCard,
  MapPin,
  Mail,
  Phone,
  Heart,
  Settings
} from "lucide-react"

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("orders")
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const { clearCart } = useCart()
  const { clearLocalFavorites } = useFavorites()

  useEffect(() => {
    checkAuth()
  }, [])

  // Fonction pour récupérer le profil utilisateur
  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
      }
    } catch (error) {
      console.error("Erreur récupération profil:", error)
    }
  }

  // Charger le profil quand on passe sur l'onglet profil
  useEffect(() => {
    if (activeTab === "profile" && user) {
      fetchUserProfile()
    }
  }, [activeTab, user])

  async function checkAuth() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.push("/login")
        return
      }

      setUser(user)
      fetchUserOrders()
    } catch (error) {
      console.error("Auth error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  async function fetchUserOrders() {
    try {
      const response = await fetch("/api/user/orders")
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      } else {
        console.error("Erreur récupération commandes:", response.statusText)
        setOrders([])
      }
    } catch (error) {
      console.error("Erreur récupération commandes:", error)
      setOrders([])
    }
  }

  async function handleSignOut() {
    try {
      await clearCart()
      clearLocalFavorites() // Nettoyer les favoris locaux
      await supabase.auth.signOut()
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      })
      router.push("/")
    } catch (error) {
      console.error("Erreur déconnexion:", error)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "En attente"
      case "confirmed":
        return "Confirmée"
      case "delivered":
        return "Livrée"
      case "cancelled":
        return "Annulée"
      case "returned":
        return "Retour de livraison"
      case "confirmed_delivery":
        return "Livraison confirmée"
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "returned":
        return "bg-orange-100 text-orange-800"
      case "confirmed_delivery":
        return "bg-emerald-100 text-emerald-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900" />
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-neutral-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">
                    Bonjour, {user?.email?.split('@')[0] || 'Utilisateur'}
                  </h1>
                  <p className="text-neutral-600">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Navigation latérale */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition ${
                      activeTab === "profile"
                        ? "bg-neutral-100 text-neutral-900"
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                    }`}
                  >
                    <User className="w-5 h-5" />
                    Mon profil
                  </button>

                  <Link
                    href="/account/favorites"
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition"
                  >
                    <Heart className="w-5 h-5" />
                    Mes favoris
                  </Link>

                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition ${
                      activeTab === "orders"
                        ? "bg-neutral-100 text-neutral-900"
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                    }`}
                  >
                    <Package className="w-5 h-5" />
                    Mes commandes
                  </button>

                  <button
                    onClick={() => setActiveTab("cart")}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition ${
                      activeTab === "cart"
                        ? "bg-neutral-100 text-neutral-900"
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Mon panier
                  </button>

                  <Link
                    href="/products"
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition"
                  >
                    <Heart className="w-5 h-5" />
                    Continuer mes achats
                  </Link>
                </nav>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="lg:col-span-3">
              {activeTab === "profile" && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-neutral-900">Mon profil</h2>
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition"
                    >
                      {editMode ? "Annuler" : "Modifier"}
                    </button>
                  </div>

                  {editMode ? (
                    <ProfileForm
                      userProfile={userProfile}
                      setUserProfile={setUserProfile}
                      setEditMode={setEditMode}
                      profileLoading={profileLoading}
                      setProfileLoading={setProfileLoading}
                      toast={toast}
                    />
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Informations personnelles */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-neutral-900">Informations personnelles</h3>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Mail className="w-5 h-5 text-neutral-400" />
                              <div>
                                <p className="text-sm text-neutral-500">Email</p>
                                <p className="text-neutral-900">{user?.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <User className="w-5 h-5 text-neutral-400" />
                              <div>
                                <p className="text-sm text-neutral-500">Nom complet</p>
                                <p className="text-neutral-900">{userProfile?.full_name || 'Non défini'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Phone className="w-5 h-5 text-neutral-400" />
                              <div>
                                <p className="text-sm text-neutral-500">Téléphone</p>
                                <p className="text-neutral-900">{userProfile?.phone || 'Non défini'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Adresse */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-neutral-900">Adresse</h3>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <MapPin className="w-5 h-5 text-neutral-400" />
                              <div>
                                <p className="text-sm text-neutral-500">Adresse</p>
                                <p className="text-neutral-900">{userProfile?.address || 'Non définie'}</p>
                              </div>
                            </div>
                            {userProfile?.city && (
                              <div className="flex items-center gap-3">
                                <span className="w-5 h-5 flex items-center justify-center text-neutral-400 font-medium">📍</span>
                                <div>
                                  <p className="text-sm text-neutral-500">Ville & Code postal</p>
                                  <p className="text-neutral-900">
                                    {userProfile.city}
                                    {userProfile.postal_code && `, ${userProfile.postal_code}`}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sécurité */}
                      <div className="space-y-4 border-t pt-6">
                        <h3 className="text-lg font-semibold text-neutral-900">Sécurité</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Settings className="w-5 h-5 text-neutral-400" />
                            <div>
                              <p className="text-sm text-neutral-500">Mot de passe</p>
                              <p className="text-neutral-900">••••••••</p>
                              <Link
                                href="/forgot-password"
                                className="text-sm text-blue-600 hover:underline block mt-1"
                              >
                                Modifier le mot de passe
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t">
                        <p className="text-sm text-neutral-500">
                          Membre depuis le {new Date(user?.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "orders" && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-xl font-bold text-neutral-900 mb-6">Mes commandes</h2>

                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-neutral-900 mb-2">Aucune commande</h3>
                      <p className="text-neutral-600 mb-6">
                        Vous n'avez pas encore passé de commande.
                      </p>
                      <Link
                        href="/products"
                        className="inline-flex px-6 py-3 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800 transition"
                      >
                        Commencer mes achats
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="border border-neutral-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-neutral-900">
                                Commande #{order.id.slice(-8).toUpperCase()}
                              </h4>
                              <p className="text-sm text-neutral-600">
                                {new Date(order.created_at).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-neutral-600">{order.customer_name}</p>
                              <p className="text-neutral-600">{order.customer_email}</p>
                            </div>
                            <div>
                              <p className="text-neutral-600">
                                {order.address}, {order.city}
                              </p>
                              <p className="font-medium text-neutral-900">
                                Total: {order.total_amount.toFixed(2)} DT
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "cart" && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-xl font-bold text-neutral-900 mb-6">Actions sur le panier</h2>
                  <div className="space-y-4">
                    <Link
                      href="/cart"
                      className="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition"
                    >
                      <ShoppingBag className="w-6 h-6 text-neutral-600" />
                      <div>
                        <h3 className="font-medium text-neutral-900">Voir mon panier</h3>
                        <p className="text-sm text-neutral-600">Consulter et modifier le contenu de votre panier</p>
                      </div>
                    </Link>

                    <Link
                      href="/products"
                      className="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition"
                    >
                      <Package className="w-6 h-6 text-neutral-600" />
                      <div>
                        <h3 className="font-medium text-neutral-900">Continuer mes achats</h3>
                        <p className="text-sm text-neutral-600">Découvrir de nouveaux produits</p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
