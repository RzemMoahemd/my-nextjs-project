"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { SettingsCard, SettingsButton } from "@/components/admin/settings-card"
import { AlertTriangle, Coins } from "lucide-react"

export default function AdminSettingsVentePage() {
  const [loading, setLoading] = useState(true)
  const [savingStock, setSavingStock] = useState(false)
  const [savingTax, setSavingTax] = useState(false)

  const [lowStockThreshold, setLowStockThreshold] = useState("5")
  const [taxRate, setTaxRate] = useState("0")
  const [pricesIncludeTax, setPricesIncludeTax] = useState(true)
  const [currency, setCurrency] = useState("DT")

  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/general")
        if (res.ok) {
          const data = await res.json()
          setLowStockThreshold(String(data.stock?.low_stock_threshold ?? 5))
          setTaxRate(String(data.tax?.rate ?? 0))
          setPricesIncludeTax(Boolean(data.tax?.prices_include_tax ?? true))
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
      {/* Stock faible */}
      <SettingsCard
        icon={<AlertTriangle size={20} className="text-neutral-700" />}
        title="Seuil de stock faible"
        description="Déclenche une notification d'admin quand une variante passe sous ce seuil"
        footer={
          <SettingsButton
            loading={savingStock}
            onClick={() =>
              save(
                "stock",
                { low_stock_threshold: Number(lowStockThreshold) || 0 },
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
      </SettingsCard>

      {/* Taxe / devise */}
      <SettingsCard
        icon={<Coins size={20} className="text-neutral-700" />}
        title="Taxes & devise"
        description="Paramètres d'affichage des prix"
        footer={
          <SettingsButton
            loading={savingTax}
            onClick={() =>
              save(
                "tax",
                { rate: Number(taxRate) || 0, prices_include_tax: pricesIncludeTax, currency },
                setSavingTax,
                "Paramètres fiscaux mis à jour.",
              )
            }
          >
            Enregistrer
          </SettingsButton>
        }
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Taux de taxe (%)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Devise</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={5}
                className={inputClass}
              />
            </div>
          </div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={pricesIncludeTax}
              onChange={(e) => setPricesIncludeTax(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700">Les prix affichés incluent la taxe</span>
          </label>
        </div>
      </SettingsCard>
    </div>
  )
}
