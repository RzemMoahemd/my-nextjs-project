"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import type { Order, User } from "@/lib/types"
import Link from "next/link"
import { ArrowLeft, Phone, Mail, Package, Check, Truck, X, Clock, RotateCcw, CheckCheck } from "lucide-react"

export default function OrdersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [feeInput, setFeeInput] = useState("")
  const [savingFee, setSavingFee] = useState(false)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(140)
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(true)
  const [thresholdInput, setThresholdInput] = useState("140")
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [periodFilter, setPeriodFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkAuth()
  }, [])

  async function fetchFreeShippingSettings() {
    try {
      const res = await fetch("/api/settings/free-shipping")
      const data = await res.json()
      const threshold = Number(data.threshold ?? 140)
      const enabled = Boolean(data.enabled ?? true)
      setFreeShippingThreshold(threshold)
      setFreeShippingEnabled(enabled)
      setThresholdInput(threshold.toString())
    } catch {
      setFreeShippingThreshold(140)
      setFreeShippingEnabled(true)
    }
  }

  async function checkAuth() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/admin/login")
        return
      }

      const { data: adminUser, error } = await supabase.from("admin_users").select("*").eq("id", user.id).single()

      if (error || !adminUser) {
        await supabase.auth.signOut()
        router.push("/admin/login")
        return
      }

      setUser(user as User)
      fetchOrders()
      fetchDeliveryFee()
      fetchFreeShippingSettings()
    } catch (error) {
      console.error("[v0] Auth error:", error)
      router.push("/admin/login")
    }
  }

  async function fetchOrders() {
    try {
      const res = await fetch("/api/orders")
      if (!res.ok) throw new Error("Failed to fetch orders")
      const data = await res.json()
      setOrders(data)
      setFilteredOrders(data)
    } catch (error) {
      console.error("[v0] Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  function filterOrders() {
    let filtered = [...orders]

    // Filtre par période
    if (periodFilter !== "all") {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.created_at)
        
        switch (periodFilter) {
          case "today":
            return orderDate >= startOfDay
          case "3days":
            const threeDaysAgo = new Date(startOfDay)
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
            return orderDate >= threeDaysAgo
          case "week":
            const weekAgo = new Date(startOfDay)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return orderDate >= weekAgo
          case "month":
            const monthAgo = new Date(startOfDay)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return orderDate >= monthAgo
          default:
            return true
        }
      })
    }

    // Filtre par statut
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }

  // Appliquer les filtres quand ils changent
  useEffect(() => {
    filterOrders()
  }, [periodFilter, statusFilter, orders])

  async function fetchDeliveryFee() {
    try {
      const res = await fetch("/api/settings/delivery-fee")
      const data = await res.json()
      const amount = Number(data.amount ?? 0)
      setDeliveryFee(amount)
      setFeeInput(amount.toString())
    } catch {
      setDeliveryFee(0)
    }
  }

  async function saveDeliveryFee(e: React.FormEvent) {
    e.preventDefault()
    setSavingFee(true)
    try {
      const amount = Number(feeInput)
      if (Number.isNaN(amount) || amount < 0) {
        alert("Le montant doit être positif.")
        return
      }

      const res = await fetch("/api/settings/delivery-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      if (!res.ok) throw new Error("Failed to update delivery fee")
      setDeliveryFee(amount)
      fetchOrders()
    } catch (error) {
      console.error("[v0] Delivery fee update error:", error)
      alert("Impossible de mettre à jour les frais.")
    } finally {
      setSavingFee(false)
    }
  }

  async function saveFreeShippingSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingThreshold(true)
    try {
      const threshold = Number(thresholdInput)
      if (Number.isNaN(threshold) || threshold < 0) {
        alert("Le montant doit être positif.")
        return
      }

      const res = await fetch("/api/settings/free-shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold, enabled: freeShippingEnabled }),
      })
      if (!res.ok) throw new Error("Failed to update free shipping settings")
      setFreeShippingThreshold(threshold)
      alert("Paramètres de livraison gratuite mis à jour avec succès.")
    } catch (error) {
      console.error("[v0] Free shipping update error:", error)
      alert("Impossible de mettre à jour les paramètres.")
    } finally {
      setSavingThreshold(false)
    }
  }

  async function updateOrderStatus(orderId: string, status: string, orderNumber?: string) {
    const statusLabels: Record<string, string> = {
      confirmed: "accepter",
      delivered: "livrer",
      cancelled: "annuler",
      returned: "marquer comme retour de livraison",
      confirmed_delivery: "confirmer la réception finale",
    }
    const actionLabel = statusLabels[status] || status

    if (!confirm(`Êtes-vous sûr de vouloir ${actionLabel} cette commande ${orderNumber ? `#${orderNumber}` : ""} ?`)) {
      return
    }

    setUpdatingOrder(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("[v0] Server error:", errorData)
        throw new Error(errorData.error || "Failed to update order")
      }

      alert(`Commande ${actionLabel}ée avec succès.`)
      fetchOrders()
    } catch (error) {
      console.error("[v0] Error updating order:", error)
      alert(`Erreur lors de la mise à jour de la commande: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setUpdatingOrder(null)
    }
  }


  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "confirmed":
        return <Check className="w-4 h-4 text-blue-600" />
      case "delivered":
        return <Truck className="w-4 h-4 text-green-600" />
      case "cancelled":
        return <X className="w-4 h-4 text-red-600" />
      case "returned":
        return <RotateCcw className="w-4 h-4 text-orange-600" />
      case "confirmed_delivery":
        return <CheckCheck className="w-4 h-4 text-emerald-600" />
      default:
        return <Package className="w-4 h-4 text-gray-600" />
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition">
                <ArrowLeft size={20} />
                Retour au dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Gestion des Commandes</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Frais de livraison */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Frais de livraison</h2>
            <form onSubmit={saveDeliveryFee} className="flex flex-col gap-4">
              <input
                type="number"
                min="0"
                step="0.5"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                className="border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="Montant en DT"
              />
              <button
                type="submit"
                disabled={savingFee}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800 transition disabled:opacity-50"
              >
                {savingFee ? "Enregistrement..." : "Mettre à jour"}
              </button>
            </form>
            <p className="text-sm text-neutral-600 mt-3">Frais actuels : {deliveryFee.toFixed(2)} DT</p>
          </div>

          {/* Livraison gratuite */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Livraison gratuite</h2>
            <form onSubmit={saveFreeShippingSettings} className="flex flex-col gap-4">
              <div>
                <label htmlFor="threshold" className="block text-sm font-medium text-neutral-700 mb-2">
                  Seuil de livraison gratuite (DT)
                </label>
                <input
                  id="threshold"
                  type="number"
                  min="0"
                  step="1"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="Montant minimum"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="enable-message"
                  type="checkbox"
                  checked={freeShippingEnabled}
                  onChange={(e) => setFreeShippingEnabled(e.target.checked)}
                  className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-900"
                />
                <label htmlFor="enable-message" className="text-sm text-neutral-700">
                  Afficher le message sur la page d'accueil
                </label>
              </div>
              <button
                type="submit"
                disabled={savingThreshold}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800 transition disabled:opacity-50"
              >
                {savingThreshold ? "Enregistrement..." : "Mettre à jour"}
              </button>
            </form>
            <p className="text-sm text-neutral-600 mt-3">
              {freeShippingEnabled 
                ? `Message actif : "Livraison gratuite à partir de ${freeShippingThreshold} DT"`
                : "Message désactivé"}
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Filtres</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtre par période */}
            <div>
              <label htmlFor="period-filter" className="block text-sm font-medium text-neutral-700 mb-2">
                Période
              </label>
              <select
                id="period-filter"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="all">Toutes les périodes</option>
                <option value="today">Aujourd'hui</option>
                <option value="3days">Ces 3 derniers jours</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
            </div>

            {/* Filtre par statut */}
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-neutral-700 mb-2">
                Statut
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmée</option>
                <option value="delivered">Livrée</option>
                <option value="confirmed_delivery">Livraison confirmée</option>
                <option value="cancelled">Annulée</option>
                <option value="returned">Retour de livraison</option>
              </select>
            </div>
          </div>

          {/* Résumé des filtres */}
          <div className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
            <span className="font-medium">{filteredOrders.length}</span>
            <span>commande{filteredOrders.length > 1 ? "s" : ""} trouvée{filteredOrders.length > 1 ? "s" : ""}</span>
            {(periodFilter !== "all" || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setPeriodFilter("all")
                  setStatusFilter("all")
                }}
                className="ml-2 text-blue-600 hover:underline"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4" />
            <p className="text-neutral-600">Chargement des commandes...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Aucune commande</h3>
            <p className="text-neutral-600">
              {orders.length === 0
                ? "Les nouvelles commandes apparaîtront ici."
                : "Aucune commande ne correspond aux filtres sélectionnés."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-1">Commande #{order.id.slice(-8).toUpperCase()}</h3>
                    <p className="text-sm text-neutral-600">
                      {new Date(order.created_at).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {getStatusLabel(order.status)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-neutral-600" />
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-neutral-600" />
                    <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline">
                      {order.customer_phone}
                    </a>
                  </div>
                  {order.customer_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-neutral-600" />
                      <a href={`mailto:${order.customer_email}`} className="text-blue-600 hover:underline">
                        {order.customer_email}
                      </a>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <p className="text-sm text-neutral-600">
                      <span className="font-medium">Adresse:</span> {order.address}
                      {order.postal_code && `, ${order.postal_code}`}, {order.city}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-neutral-500">
                      Produits : {(order.total_amount - order.delivery_fee).toFixed(2)} DT
                    </span>
                    <span className="text-sm text-neutral-500">Livraison : {order.delivery_fee.toFixed(2)} DT</span>
                    <span className="font-semibold text-neutral-900">Total : {order.total_amount.toFixed(2)} DT</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-neutral-900 mb-2">Articles commandés:</h4>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-neutral-100 last:border-b-0">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-neutral-600 ml-2">
                            ({item.color && `${item.color}, `}Taille: {item.size}, Qté: {item.quantity})
                          </span>
                        </div>
                        <span className="font-medium">{(item.price * item.quantity).toFixed(2)} DT</span>
                      </div>
                    ))}
                  </div>
                </div>

                {order.notes && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-neutral-900 mb-1">Notes:</h4>
                    <p className="text-neutral-700">{order.notes}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {/* Statut: pending - Afficher Accepter et Annuler */}
                  {order.status === "pending" && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, "confirmed", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <Check size={16} />
                        Accepter
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, "cancelled", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <X size={16} />
                        Annuler
                      </button>
                    </>
                  )}

                  {/* Statut: confirmed - Afficher Livrer et Annuler */}
                  {order.status === "confirmed" && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, "delivered", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <Truck size={16} />
                        Livrer
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, "cancelled", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <X size={16} />
                        Annuler
                      </button>
                    </>
                  )}

                  {/* Statut: delivered - Afficher Confirmer livraison finale et Retour de livraison */}
                  {order.status === "delivered" && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, "confirmed_delivery", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <CheckCheck size={16} />
                        Confirmer livraison finale
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, "returned", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <RotateCcw size={16} />
                        Retour de livraison
                      </button>
                    </>
                  )}

                  {/* Statut: confirmed_delivery - Aucun bouton (livraison confirmée par le client) */}
                  {order.status === "confirmed_delivery" && (
                    <p className="text-sm text-emerald-600 italic">
                      La réception de cette commande a été confirmée par le client.
                    </p>
                  )}

                  {/* Statut: cancelled - Afficher Remettre en attente */}
                  {order.status === "cancelled" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "pending", order.id.slice(-8).toUpperCase())}
                      disabled={updatingOrder === order.id}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      <Clock size={16} />
                      Remettre en attente
                    </button>
                  )}

                  {/* Statut: returned - Aucun bouton (tous désactivés) */}
                  {order.status === "returned" && (
                    <p className="text-sm text-orange-600 italic">
                      Cette commande est marquée comme retour de livraison. L'inventaire a été restauré.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

