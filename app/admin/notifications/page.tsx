"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, CheckCircle2, Bell } from "lucide-react"

interface LowStockNotification {
  id: string
  product_id: string | null
  product_name: string | null
  size: string | null
  current_stock: number | null
  threshold: number | null
  notified_at: string
  is_resolved: boolean
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<LowStockNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/notifications/low-stock")
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      setNotifications(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const markResolved = async (id: string) => {
    try {
      setResolvingId(id)
      const res = await fetch("/api/notifications/low-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: id }),
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour")
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition-colors"
                title="Retour au tableau de bord"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-neutral-900">Notifications de stock faible</h1>
                <p className="text-xs text-neutral-500">
                  Stock par taille sous le seuil défini dans Paramètres &gt; Vente
                </p>
              </div>
            </div>
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Actualiser
            </button>
          </div>
        </div>
      </div>


      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900" />
            <p className="text-sm text-neutral-500">Chargement des notifications…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-green-50 border border-green-200">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-neutral-900">Aucune notification</p>
              <p className="text-sm text-neutral-500 mt-1">
                Tous les produits sont au-dessus du seuil de stock faible.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 hover:border-amber-300 transition-colors"
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-50 border border-amber-200 flex-shrink-0">
                  <Bell size={18} className="text-amber-600" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">
                    {n.product_name || "Produit supprimé"}
                    {n.size ? ` — Taille ${n.size}` : ""}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Stock : <span className="font-semibold text-red-600">{n.current_stock ?? 0}</span>{" "}
                    / seuil {n.threshold ?? 0} · Détecté le{" "}
                    {new Date(n.notified_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {n.product_id && (
                    <Link
                      href={`/admin/products/${n.product_id}/edit`}
                      className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors"
                    >
                      Modifier le produit
                    </Link>
                  )}
                  <button
                    onClick={() => markResolved(n.id)}
                    disabled={resolvingId === n.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {resolvingId === n.id ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    Marquer comme résolue
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
