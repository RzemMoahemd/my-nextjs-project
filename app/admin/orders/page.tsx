"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import type { Order, User } from "@/lib/types"
import Link from "next/link"
import { ArrowLeft, Phone, Mail, Package, Check, Truck, X, Clock, RotateCcw, CheckCheck, MoreVertical, Eye, Edit, MessageCircle, Printer, Trash2, Package2, AlertTriangle } from "lucide-react"
import { useConfirmDialogWithUI } from "@/components/confirm-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ExchangeModal } from "@/components/exchange-modal"
import { toast } from "sonner"

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
  const [searchQuery, setSearchQuery] = useState("")

  // Actions menu state
  const [openActionsMenu, setOpenActionsMenu] = useState<string | null>(null)

  // Articles expansion state
  const [expandedArticles, setExpandedArticles] = useState<Record<string, boolean>>({})

  // Exchange modal state
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false)
  const [selectedOrderForExchange, setSelectedOrderForExchange] = useState<Order | null>(null)

  const router = useRouter()
  const supabase = createClientComponentClient()

  // Hook pour les dialogues de confirmation modernes
  const {
    isOpen: confirmDialogOpen,
    options: confirmDialogOptions,
    confirm,
    handleConfirm: handleConfirmDialog,
    handleCancel: handleCancelDialog,
    handleClose: handleCloseDialog,
  } = useConfirmDialogWithUI()

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

      // Grouper les échanges avec leurs commandes parentes
      const groupedOrders = groupOrdersWithExchanges(data)
      setOrders(groupedOrders)
      setFilteredOrders(groupedOrders)
    } catch (error) {
      console.error("[v0] Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour grouper les échanges avec leurs commandes parentes
  function groupOrdersWithExchanges(orders: Order[]) {
    const parentOrders: Order[] = []
    const exchangeOrders: Order[] = []

    // Séparer les commandes normales des échanges
    orders.forEach(order => {
      if (order.type === 'exchange') {
        exchangeOrders.push(order)
      } else {
        parentOrders.push(order)
      }
    })

    // Créer une liste groupée où les échanges sont placés juste après leur commande parente
    const groupedOrders: Order[] = []

    parentOrders.forEach(parentOrder => {
      // Ajouter la commande parente
      groupedOrders.push(parentOrder)

      // Ajouter tous les échanges de cette commande parente
      const relatedExchanges = exchangeOrders.filter(exchange =>
        exchange.parent_order_id === parentOrder.id
      )
      groupedOrders.push(...relatedExchanges)
    })

    // Ajouter les échanges orphelins (sans parent) à la fin
    const orphanedExchanges = exchangeOrders.filter(exchange =>
      !exchange.parent_order_id ||
      !parentOrders.some(parent => parent.id === exchange.parent_order_id)
    )
    groupedOrders.push(...orphanedExchanges)

    return groupedOrders
  }

  function filterOrders() {
    let filtered = [...orders]

    // Recherche par numéro de commande, téléphone ou nom client
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((order) => {
        const orderNumber = order.id.slice(-8).toUpperCase().toLowerCase()
        const customerName = order.customer_name.toLowerCase()
        const customerPhone = order.customer_phone.toLowerCase()

        return orderNumber.includes(query) ||
               customerName.includes(query) ||
               customerPhone.includes(query)
      })
    }

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
  }, [periodFilter, statusFilter, searchQuery, orders])

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
        toast.error("Le montant doit être positif.")
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
      toast.success("Frais de livraison mis à jour avec succès.")
    } catch (error) {
      console.error("[v0] Delivery fee update error:", error)
      toast.error("Impossible de mettre à jour les frais de livraison.")
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
        toast.error("Le montant doit être positif.")
        return
      }

      const res = await fetch("/api/settings/free-shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold, enabled: freeShippingEnabled }),
      })
      if (!res.ok) throw new Error("Failed to update free shipping settings")
      setFreeShippingThreshold(threshold)
      toast.success("Paramètres de livraison gratuite mis à jour avec succès.")
    } catch (error) {
      console.error("[v0] Free shipping update error:", error)
      toast.error("Impossible de mettre à jour les paramètres de livraison gratuite.")
    } finally {
      setSavingThreshold(false)
    }
  }



  // Fonction pour annuler l'annulation (UNDO)
  async function undoCancellation(orderId: string, orderNumber?: string) {
    const confirmed = await confirm({
      title: `Rétablir la commande ${orderNumber ? `#${orderNumber}` : ""}`,
      description: "La commande reviendra à son statut précédent.",
      confirmText: "Rétablir la commande",
      variant: "default"
    })

    if (!confirmed) return

    setUpdatingOrder(orderId)
    try {
      // Remettre au statut précédent ou à pending par défaut
      // Note: Le backend gère automatiquement le nettoyage des métadonnées UNDO
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pending" // Le backend gère le reste automatiquement
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("[v0] Server error:", errorData)
        throw new Error(errorData.error || "Failed to undo cancellation")
      }

      toast.success("Annulation annulée avec succès. La commande est remise à son statut précédent.")
      fetchOrders()
    } catch (error) {
      console.error("[v0] Error undoing cancellation:", error)
      toast.error(`Erreur lors de l'annulation de l'annulation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setUpdatingOrder(null)
    }
  }

  async function updateOrderStatus(orderId: string, status: string, orderNumber?: string) {
    const statusLabels: Record<string, string> = {
      confirmed: "accepter",
      preparing: "mettre en préparation",
      in_delivery: "mettre en livraison",
      delivered: "marquer comme livrée",
      delivery_failed: "marquer comme échec de livraison",
      cancelled: "annuler",
      returned: "marquer comme retour de livraison",
      confirmed_delivery: "confirmer la réception finale",
    }
    const actionLabel = statusLabels[status] || status

    // Note: Le backend est la seule source de vérité pour les validations métier.
    // Le frontend masque seulement les boutons UI mais ne bloque pas les appels API.
    const currentOrder = orders.find(o => o.id === orderId)

    const confirmed = await confirm({
      title: `${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} la commande ${orderNumber ? `#${orderNumber}` : ""}`,
      description: `La commande passera du statut "${currentOrder ? getStatusLabel(currentOrder.status) : 'inconnu'}" au statut "${getStatusLabel(status)}".`,
      confirmText: actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1),
      variant: status === "cancelled" ? "destructive" : "default"
    })

    if (!confirmed) return

    setUpdatingOrder(orderId)
    try {
      const updateData: any = { status }

      // Si on annule une commande, ajouter les métadonnées UNDO
      if (status === "cancelled") {
        updateData.cancelled_at = new Date().toISOString()
        updateData.can_undo_cancel = true
      }

      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`
        try {
          const errorData = await res.json()
          console.error("[v0] Server error:", errorData)
          errorMessage = errorData.error || errorData.details || errorMessage
        } catch (jsonError) {
          console.error("[v0] Failed to parse error response:", jsonError)
          // Try to get text response
          try {
            const textResponse = await res.text()
            console.error("[v0] Raw error response:", textResponse)
            if (textResponse) {
              errorMessage = textResponse
            }
          } catch (textError) {
            console.error("[v0] Failed to get text response:", textError)
          }
        }
        throw new Error(errorMessage)
      }

      toast.success(`Commande ${actionLabel}ée avec succès.`)
      fetchOrders()
    } catch (error) {
      console.error("[v0] Error updating order:", error)
      toast.error(`Erreur lors de la mise à jour de la commande: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
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
      case "preparing":
        return <Package2 className="w-4 h-4 text-purple-600" />
      case "in_delivery":
        return <Truck className="w-4 h-4 text-cyan-600" />
      case "delivered":
        return <Truck className="w-4 h-4 text-green-600" />
      case "delivery_failed":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
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
      case "preparing":
        return "En préparation"
      case "in_delivery":
        return "En cours de livraison"
      case "delivered":
        return "Livrée"
      case "delivery_failed":
        return "Échec de livraison"
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
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "preparing":
        return "bg-purple-100 text-purple-800 border-purple-300"
      case "in_delivery":
        return "bg-cyan-100 text-cyan-800 border-cyan-300"
      case "delivered":
        return "bg-green-100 text-green-800 border-green-300"
      case "delivery_failed":
        return "bg-red-100 text-red-800 border-red-300"
      case "cancelled":
        return "bg-red-50 text-red-600 border-red-200"
      case "returned":
        return "bg-orange-50 text-orange-600 border-orange-200"
      case "confirmed_delivery":
        return "bg-emerald-50 text-emerald-600 border-emerald-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getStatusPriority = (status: string) => {
    // Retourne la priorité (plus élevé = plus prioritaire)
    switch (status) {
      case "pending":
        return 8 // Très prioritaire - nécessite action immédiate
      case "delivery_failed":
        return 7 // Urgent - échec de livraison
      case "confirmed":
        return 6 // Prioritaire - prêt pour préparation
      case "preparing":
        return 5 // Important - en cours de préparation
      case "in_delivery":
        return 4 // Important - en cours de livraison
      case "delivered":
        return 3 // Important - livraison effectuée
      case "returned":
        return 2 // Moyen - nécessite traitement
      case "cancelled":
        return 1 // Faible - terminé négativement
      case "confirmed_delivery":
        return 0 // Terminé positivement
      default:
        return 0
    }
  }

  const getStatusAccent = (status: string) => {
    switch (status) {
      case "pending":
        return "border-l-4 border-l-yellow-400 bg-gradient-to-r from-yellow-50 to-white"
      case "confirmed":
        return "border-l-4 border-l-blue-400 bg-gradient-to-r from-blue-50 to-white"
      case "preparing":
        return "border-l-4 border-l-purple-400 bg-gradient-to-r from-purple-50 to-white"
      case "in_delivery":
        return "border-l-4 border-l-cyan-400 bg-gradient-to-r from-cyan-50 to-white"
      case "delivered":
        return "border-l-4 border-l-green-400 bg-gradient-to-r from-green-50 to-white"
      case "delivery_failed":
        return "border-l-4 border-l-red-400 bg-gradient-to-r from-red-50 to-white"
      case "cancelled":
        return "border-l-2 border-l-red-300 bg-gradient-to-r from-red-25 to-white"
      case "returned":
        return "border-l-2 border-l-orange-300 bg-gradient-to-r from-orange-25 to-white"
      case "confirmed_delivery":
        return "border-l-2 border-l-emerald-300 bg-gradient-to-r from-emerald-25 to-white"
      default:
        return "border-l-2 border-l-gray-300 bg-white"
    }
  }

  // Fonctions utilitaires pour gestion des statuts finaux et UNDO
  const isFinalStatus = (status: string) => {
    return ['cancelled', 'returned', 'confirmed_delivery'].includes(status)
  }

  const canUndoCancellation = (order: Order) => {
    if (order.status !== 'cancelled' || !order.cancelled_at || !order.can_undo_cancel) {
      return false
    }

    const cancelledTime = new Date(order.cancelled_at).getTime()
    const currentTime = new Date().getTime()
    const gracePeriodMs = 5 * 60 * 1000 // 5 minutes de grâce

    return (currentTime - cancelledTime) < gracePeriodMs
  }

  const getTimeRemainingForUndo = (order: Order) => {
    if (!canUndoCancellation(order)) return 0

    const cancelledTime = new Date(order.cancelled_at!).getTime()
    const currentTime = new Date().getTime()
    const gracePeriodMs = 5 * 60 * 1000 // 5 minutes

    const remainingMs = gracePeriodMs - (currentTime - cancelledTime)
    return Math.max(0, Math.ceil(remainingMs / 1000)) // secondes restantes
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

        {/* Guide des statuts */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
            <span className="text-blue-600">🔄</span>
            Flux complet des statuts de commande
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-neutral-700 mb-2">Flux normal :</div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-600">⏳</span>
                  <span>En attente</span>
                </div>
                <span className="text-neutral-400">→</span>
                <div className="flex items-center gap-1">
                  <span className="text-blue-600">📦</span>
                  <span>Confirmée</span>
                </div>
                <span className="text-neutral-400">→</span>
                <div className="flex items-center gap-1">
                  <span className="text-purple-600">🛠️</span>
                  <span>Préparation</span>
                </div>
                <span className="text-neutral-400">→</span>
                <div className="flex items-center gap-1">
                  <span className="text-cyan-600">🚛</span>
                  <span>En livraison</span>
                </div>
                <span className="text-neutral-400">→</span>
                <div className="flex items-center gap-1">
                  <span className="text-green-600">✅</span>
                  <span>Livrée</span>
                </div>
                <span className="text-neutral-400">→</span>
                <div className="flex items-center gap-1">
                  <span className="text-emerald-600">🟢</span>
                  <span>Confirmée</span>
                </div>
              </div>
            </div>
            <div>
              <div className="font-medium text-neutral-700 mb-2">États alternatifs :</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-red-600">❌</span>
                  <span className="text-red-600 font-medium">Annulée</span>
                  <span className="text-neutral-500">(depuis n'importe quel statut)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-500">⚠️</span>
                  <span className="text-red-500 font-medium">Échec de livraison</span>
                  <span className="text-neutral-500">(depuis En livraison)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-600">↩️</span>
                  <span className="text-orange-600 font-medium">Retour de livraison</span>
                  <span className="text-neutral-500">(depuis Livrée ou Échec)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Filtres</h2>

          {/* Recherche */}
          <div className="mb-6">
            <label htmlFor="search" className="block text-sm font-medium text-neutral-700 mb-2">
              🔍 Recherche par numéro de commande, téléphone ou nom client
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex: ABC12345, +216..., Jean Dupont..."
              className="w-full border border-neutral-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

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
                <option value="preparing">En préparation</option>
                <option value="in_delivery">En cours de livraison</option>
                <option value="delivered">Livrée</option>
                <option value="delivery_failed">Échec de livraison</option>
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
          <div className="space-y-4">
            {filteredOrders
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((order, index, array) => {
                const isExchange = order.type === 'exchange'
                const previousOrder = isExchange && index > 0 ? array[index - 1] : null
                const isRelatedExchange = isExchange && previousOrder && previousOrder.id === order.parent_order_id

                return (
                  <div key={order.id} className={`bg-white rounded-lg shadow-sm border p-6 ${getStatusAccent(order.status)} ${
                    isExchange ? 'ml-8 relative' : ''
                  }`}>
                    {/* Ligne de connexion pour les échanges */}
                    {isRelatedExchange && (
                      <div className="absolute -left-8 top-6 w-8 h-0.5 bg-blue-300"></div>
                    )}

                    {/* Badge d'échange */}
                    {isExchange && (
                      <div className="absolute -left-2 top-4 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                        ÉCHANGE
                      </div>
                    )}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-1 tracking-tight">Commande #{order.id.slice(-8).toUpperCase()}</h3>
                    <p className="text-sm text-neutral-400">
                      {new Date(order.created_at).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm border-2 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {getStatusLabel(order.status)}
                    </div>

                    {/* Bouton menu actions toujours visible */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenActionsMenu(openActionsMenu === order.id ? null : order.id)
                        }}
                        className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Menu déroulant */}
                      {openActionsMenu === order.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenActionsMenu(null)
                              // Voir détails - pourrait ouvrir une modal détaillée
                              toast.info(`Fonctionnalité "Voir détails" à implémenter pour la commande #${order.id.slice(-8).toUpperCase()}`)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                          >
                            <Eye size={14} />
                            Voir détails
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenActionsMenu(null)
                              // Changer statut - pourrait ouvrir un sélecteur
                              toast.info(`Fonctionnalité "Changer statut" à implémenter pour la commande #${order.id.slice(-8).toUpperCase()}`)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                          >
                            <Edit size={14} />
                            Changer statut
                          </button>

                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              setOpenActionsMenu(null)
                              // Contacter client - ouvrir email/tel
                              const contactMethod = await confirm({
                                title: "Contacter le client",
                                description: `Comment souhaitez-vous contacter ${order.customer_name} ?`,
                                confirmText: "Email",
                                cancelText: "Téléphone"
                              })
                              if (contactMethod && order.customer_email) {
                                window.open(`mailto:${order.customer_email}?subject=Commande #${order.id.slice(-8).toUpperCase()}`)
                              } else {
                                window.open(`tel:${order.customer_phone}`)
                              }
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                          >
                            <MessageCircle size={14} />
                            Contacter client
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenActionsMenu(null)
                              // Imprimer - ouvrir fenêtre d'impression
                              window.print()
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                          >
                            <Printer size={14} />
                            Imprimer / Exporter
                          </button>

                          {/* Bouton Échanger - seulement pour les commandes livrées */}
                          {(order.status === "delivered" || order.status === "confirmed_delivery") && !order.parent_order_id && (
                            <>
                              <div className="border-t border-neutral-100 my-1"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenActionsMenu(null)
                                  setSelectedOrderForExchange(order)
                                  setExchangeModalOpen(true)
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                              >
                                🔄 Échanger
                              </button>
                            </>
                          )}

                          {order.status !== "cancelled" && order.status !== "confirmed_delivery" && order.status !== "returned" && (
                            <>
                              <div className="border-t border-neutral-100 my-1"></div>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  setOpenActionsMenu(null)
                                  const confirmed = await confirm({
                                    title: "Supprimer la commande",
                                    description: `Êtes-vous sûr de vouloir supprimer la commande #${order.id.slice(-8).toUpperCase()} ? Cette action est irréversible.`,
                                    confirmText: "Supprimer",
                                    cancelText: "Annuler",
                                    variant: "destructive"
                                  })
                                  if (confirmed) {
                                    // Logique de suppression
                                    toast.info(`Suppression de la commande #${order.id.slice(-8).toUpperCase()} (fonctionnalité à implémenter)`)
                                  }
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 size={14} />
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bloc Client ultra-compact et actionnable */}
                <div className="mb-4 p-3 bg-blue-50/30 border border-blue-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-neutral-900 flex items-center gap-1.5">
                      <span className="text-neutral-500 text-sm">👤</span>
                      Client
                    </h4>
                  </div>
                  <div className="space-y-1.5">
                    {/* Ligne principale : Nom + Téléphone */}
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-neutral-900 flex-1">{order.customer_name}</span>
                      <button
                        onClick={() => window.open(`tel:${order.customer_phone}`)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded border transition-colors"
                        title={`Appeler ${order.customer_phone}`}
                      >
                        <span className="text-neutral-500">📞</span>
                        <span className="font-medium">{order.customer_phone}</span>
                      </button>
                    </div>

                    {/* Ligne secondaire : Email + Adresse */}
                    <div className="flex items-center justify-between gap-3 text-xs text-neutral-600">
                      {order.customer_email && (
                        <button
                          onClick={() => window.open(`mailto:${order.customer_email}?subject=Commande #${order.id.slice(-8).toUpperCase()}`)}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          title={`Email ${order.customer_email}`}
                        >
                          <span className="text-neutral-400">✉️</span>
                          <span className="underline">{order.customer_email}</span>
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          const fullAddress = `${order.address}${order.postal_code ? `, ${order.postal_code}` : ''}, ${order.city}`;
                          await navigator.clipboard.writeText(fullAddress);
                          toast.success('Adresse copiée dans le presse-papiers !');
                        }}
                        className="flex items-center gap-1 hover:text-neutral-800 transition-colors ml-auto"
                        title="Copier l'adresse complète"
                      >
                        <span className="text-neutral-400">📍</span>
                        <span className="underline">
                          {order.address}{order.postal_code && `, ${order.postal_code}`}, {order.city}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bloc Financier */}
                <div className="mb-4 p-3 bg-green-50/30 border border-green-100 rounded-lg">
                  <h4 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                    <span className="text-green-600">💰</span>
                    Récapitulatif
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="text-center p-1.5 bg-white rounded border">
                      <div className="text-neutral-500 text-xs">Produits</div>
                      <div className="font-semibold text-neutral-900">{(order.total_amount - order.delivery_fee).toFixed(2)} DT</div>
                    </div>
                    <div className="text-center p-1.5 bg-white rounded border">
                      <div className="text-neutral-500 text-xs">Livraison</div>
                      <div className="font-semibold text-neutral-900">{order.delivery_fee.toFixed(2)} DT</div>
                    </div>
                    <div className="text-center p-1.5 bg-gradient-to-br from-green-100 to-green-50 rounded border-2 border-green-300 relative">
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-600 text-white text-xs font-medium rounded-full mb-1">
                        💰 À encaisser
                      </div>
                      <div className="text-xs text-green-600 font-medium">Total</div>
                      <div className="font-bold text-green-800 text-lg">{order.total_amount.toFixed(2)} DT</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-neutral-900 mb-2">Articles commandés:</h4>
                  <div className="space-y-1">
                    {/* Afficher les 3 premiers articles (ou tous si ≤ 3) */}
                    {(expandedArticles[order.id] ? order.items : order.items.slice(0, 3)).map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <div className="flex-1 min-w-0 text-sm">
                          <span className="font-medium text-neutral-900">
                            {item.name}
                            {item.color && ` • ${item.color}`}
                            {` • ${item.size} ×${item.quantity}`}
                          </span>
                        </div>
                        <span className="font-medium text-neutral-900 ml-2 flex-shrink-0 text-sm">
                          {(item.price * item.quantity).toFixed(2)} DT
                        </span>
                      </div>
                    ))}

                    {/* Bouton pour afficher/réduire les articles supplémentaires */}
                    {order.items.length > 3 && (
                      <button
                        onClick={() => setExpandedArticles(prev => ({
                          ...prev,
                          [order.id]: !prev[order.id]
                        }))}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1 transition-colors"
                      >
                        {expandedArticles[order.id]
                          ? 'Réduire la liste'
                          : `Afficher les ${order.items.length - 3} autres articles`
                        }
                      </button>
                    )}
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
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base font-medium"
                      >
                        <Check size={18} />
                        Accepter
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, "cancelled", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base font-medium"
                      >
                        <X size={18} />
                        Annuler
                      </button>
                    </>
                  )}

                  {/* Statut: confirmed - Afficher Mettre en préparation et Annuler */}
                  {order.status === "confirmed" && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, "preparing", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base font-medium"
                      >
                        <Package2 size={18} />
                        Préparer
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, "cancelled", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base font-medium"
                      >
                        <X size={18} />
                        Annuler
                      </button>
                    </>
                  )}

                  {/* Statut: preparing - Afficher Mettre en livraison et Annuler */}
                  {order.status === "preparing" && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, "in_delivery", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base font-medium"
                      >
                        <Truck size={18} />
                        En livraison
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, "cancelled", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base font-medium"
                      >
                        <X size={18} />
                        Annuler
                      </button>
                    </>
                  )}

                  {/* Statut: in_delivery - Afficher Livrer et Échec de livraison */}
                  {order.status === "in_delivery" && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, "delivered", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base font-medium"
                      >
                        <CheckCheck size={18} />
                        Livrée
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, "delivery_failed", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base font-medium"
                      >
                        <AlertTriangle size={18} />
                        Échec livraison
                      </button>
                    </>
                  )}

                  {/* Statut: delivered - Afficher Confirmer livraison finale et Retour de livraison */}
                  {order.status === "delivered" && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, "confirmed_delivery", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base font-medium"
                      >
                        <CheckCheck size={18} />
                        Confirmer livraison finale
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, "returned", order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base font-medium"
                      >
                        <RotateCcw size={18} />
                        Retour de livraison
                      </button>
                    </>
                  )}

                  {/* Statut: delivery_failed - Afficher Retour de livraison */}
                  {order.status === "delivery_failed" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "returned", order.id.slice(-8).toUpperCase())}
                      disabled={updatingOrder === order.id}
                      className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base font-medium"
                    >
                      <RotateCcw size={18} />
                      Retour de livraison
                    </button>
                  )}

                  {/* Statut: confirmed_delivery - Aucun bouton (livraison confirmée par le client) */}
                  {order.status === "confirmed_delivery" && (
                    <p className="text-sm text-emerald-600 italic">
                      La réception de cette commande a été confirmée par le client.
                    </p>
                  )}

                  {/* Statut: cancelled - Afficher UNDO si possible */}
                  {order.status === "cancelled" && canUndoCancellation(order) && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => undoCancellation(order.id, order.id.slice(-8).toUpperCase())}
                        disabled={updatingOrder === order.id}
                        className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base font-medium"
                      >
                        <Clock size={18} />
                        Rétablir la commande
                      </button>
                      <p className="text-xs text-yellow-600 text-center">
                        {getTimeRemainingForUndo(order)} secondes restantes
                      </p>
                    </div>
                  )}

                  {/* Statut: returned - Aucun bouton (tous désactivés) */}
                  {order.status === "returned" && (
                    <p className="text-sm text-orange-600 italic">
                      Cette commande est marquée comme retour de livraison. L'inventaire a été restauré.
                    </p>
                  )}
                </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* Dialogue de confirmation moderne */}
        <ConfirmDialog
          isOpen={confirmDialogOpen}
          options={confirmDialogOptions}
          onConfirm={handleConfirmDialog}
          onCancel={handleCancelDialog}
          onClose={handleCloseDialog}
        />

        {/* Modal d'échange */}
        <ExchangeModal
          isOpen={exchangeModalOpen}
          onClose={() => {
            setExchangeModalOpen(false)
            setSelectedOrderForExchange(null)
          }}
          order={selectedOrderForExchange}
          onExchangeCreated={() => {
            fetchOrders() // Rafraîchir la liste des commandes
            setExchangeModalOpen(false)
            setSelectedOrderForExchange(null)
          }}
        />
      </div>
    </div>
  )
}
