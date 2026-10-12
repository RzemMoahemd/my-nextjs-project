"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { SettingsCard, SettingsButton } from "@/components/admin/settings-card"
import { Wrench, Search } from "lucide-react"

export default function AdminSettingsAvancePage() {
  const [loading, setLoading] = useState(true)
  const [savingMaintenance, setSavingMaintenance] = useState(false)
  const [savingSeo, setSavingSeo] = useState(false)

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState("")

  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoKeywords, setSeoKeywords] = useState("")

  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/general")
        if (res.ok) {
          const data = await res.json()
          setMaintenanceEnabled(Boolean(data.maintenance?.enabled ?? false))
          setMaintenanceMessage(data.maintenance?.message ?? "")
          setSeoTitle(data.seo?.title ?? "")
          setSeoDescription(data.seo?.description ?? "")
          setSeoKeywords(data.seo?.keywords ?? "")
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
    "w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"

  return (
    <div className="space-y-6">
      {/* Maintenance */}
      <SettingsCard
        icon={<Wrench size={20} className="text-neutral-700" />}
        title="Mode maintenance"
        description="Restreint l'accès à la boutique pendant des travaux (message conservé en base)"
        footer={
          <SettingsButton
            loading={savingMaintenance}
            onClick={() =>
              save(
                "maintenance",
                { enabled: maintenanceEnabled, message: maintenanceMessage },
                setSavingMaintenance,
                maintenanceEnabled ? "Mode maintenance activé (démarrage prochain)." : "Mode maintenance désactivé.",
              )
            }
          >
            Enregistrer
          </SettingsButton>
        }
      >
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={maintenanceEnabled}
              onChange={(e) => setMaintenanceEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700">Activer le mode maintenance</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Message affiché</label>
            <textarea
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
        </div>
      </SettingsCard>

      {/* SEO */}
      <SettingsCard
        icon={<Search size={20} className="text-neutral-700" />}
        title="Référencement (SEO)"
        description="Métadonnées utilisées par les moteurs de recherche et les réseaux sociaux"
        footer={
          <SettingsButton
            loading={savingSeo}
            onClick={() =>
              save(
                "seo",
                { title: seoTitle, description: seoDescription, keywords: seoKeywords },
                setSavingSeo,
                "Paramètres SEO enregistrés.",
              )
            }
          >
            Enregistrer
          </SettingsButton>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Titre du site</label>
            <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Mots-clés (séparés par des virgules)</label>
            <input
              type="text"
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}
