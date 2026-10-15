"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { SettingsCard, SettingsButton } from "@/components/admin/settings-card"
import { AlertTriangle, Coins, ShoppingCart } from "lucide-react"

export default function AdminSettingsVentePage() {
  const [loading, setLoading] = useState(true)
  const [savingStock, setSavingStock] = useState(false)
  const [savingDisplayThreshold, setSavingDisplayThreshold] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)

  const [lowStockThreshold, setLowStockThreshold] = useState("5")
  const [lowStockDisplayThreshold, setLowStockDisplayThreshold] = useState("5")
  const [currency, setCurrency] = useState("DT")

  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/general")
        if (res.ok) {
          const data = await res.json()
          setLowStockThreshold(String(data.stock?.low_stock_threshold ?? 5))
          setLowStockDisplayThreshold(String(data.stock?.low_stock_display_threshold ?? 5))
          setCurrency(data.tax?.currency ?? "DT")
        }
      } catch (error) {
        console.error("[settings] load error:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function save(key: string, value: any, setSaving: (v: boolean) => void, successMsg: string) {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Paramètre enregistré", description: successMsg })
    } catch (error) {
      console.error("[settings] save error:", error)
      toast({ title: "Erreur", description: "Impossible d'enregistrer ce paramètre.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900" />
      </div>
    )
  }

  const inputClass =
    "w-full sm:max-w-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"

  return (
    <div className="space-y-6">
      {/* Devise */}
      <SettingsCard
        icon={<Coins size={20} className="text-neutral-700" />}
        title="Devise"
        description="Symbole affiché après tous les prix du site (panier, commandes, produits...)"
        footer={
          <SettingsButton
            loading={savingCurrency}
            onClick={() =>
              save(
                "tax",
                { currency: currency.trim() || "DT" },
                setSavingCurrency,
                `Les prix s'affichent désormais en ${currency.trim() || "DT"}.`,
              )
            }
          >
            Enregistrer
          </SettingsButton>
        }
      >
        <label className="block text-sm font-medium text-neutral-700 mb-1">Symbole</label>
        <input
          type="text"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          maxLength={5}
          placeholder="DT"
          className={inputClass}
        />
      </SettingsCard>

      {/* Stock faible */}
      <SettingsCard
        icon={<AlertTriangle size={20} className="text-neutral-700" />}
        title="Seuil de stock faible"
        description="Seuil par défaut appliqué à tous les produits qui ne définissent pas leur propre seuil dans leur fiche produit. Déclenche une notification dans le tableau de bord admin quand une taille passe sous ce seuil"
        footer={
          <SettingsButton
            loading={savingStock}
            onClick={() =>
              save(
                "stock",
                {
                  low_stock_threshold: Number(lowStockThreshold) || 0,
                  low_stock_display_threshold: Number(lowStockDisplayThreshold) || 0,
                },
                setSavingStock,
                `Seuil défini à ${lowStockThreshold} unités.`,
              )
            }
          >
            Enregistrer
          </SettingsButton>
        }
      >
        <label className="block text-sm font-medium text-neutral-700 mb-1">Quantité seuil</label>
        <input
          type="number"
          min="0"
          value={lowStockThreshold}
          onChange={(e) => setLowStockThreshold(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-neutral-500 mt-2">
          Un produit peut définir son propre seuil (fiche produit) : il écrasera cette valeur globale.
        </p>
      </SettingsCard>

      {/* Seuil d'affichage du message client sur la fiche produit */}
      <SettingsCard
        icon={<ShoppingCart size={20} className="text-neutral-700" />}
        title="Seuil d'affichage du message de stock"
        description="Quantité à partir de laquelle le message « Plus que X disponible » s'affiche sur la carte produit. Le message se base sur la variante sélectionnée par le client (couleur + taille), et non sur le stock total du produit."
        footer={
          <SettingsButton
            loading={savingDisplayThreshold}
            onClick={() =>
              save(
                "stock",
                {
                  low_stock_threshold: Number(lowStockThreshold) || 0,
                  low_stock_display_threshold: Number(lowStockDisplayThreshold) || 0,
                },
                setSavingDisplayThreshold,
                `Le message s'affichera quand une variante atteindra ${lowStockDisplayThreshold} unité(s) ou moins.`,
              )
            }
          >
            Enregistrer
          </SettingsButton>
        }
      >
        <label className="block text-sm font-medium text-neutral-700 mb-1">Quantité seuil d'affichage</label>
        <input
          type="number"
          min="0"
          value={lowStockDisplayThreshold}
          onChange={(e) => setLowStockDisplayThreshold(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-neutral-500 mt-2">
          Exemple : pour une veste noire/blanche en XL/XXL, si le client sélectionne « Noir XXL », le message
          « Plus que X disponible » n'apparaît que si cette variante précise a une quantité inférieure ou égale
          à ce seuil. Mettre 0 pour désactiver complètement le message.
        </p>
      </SettingsCard>
    </div>
  )
}
