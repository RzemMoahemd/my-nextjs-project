"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { SettingsCard, SettingsButton } from "@/components/admin/settings-card"
import { Wrench, Search, X } from "lucide-react"

export default function AdminSettingsAvancePage() {
  const [loading, setLoading] = useState(true)
  const [savingMaintenance, setSavingMaintenance] = useState(false)
  const [savingReservation, setSavingReservation] = useState(false)
  const [savingSeo, setSavingSeo] = useState(false)
  const [ogImageUploading, setOgImageUploading] = useState(false)

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState("")

  const [reservationDurationMinutes, setReservationDurationMinutes] = useState(15)

  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoOgImage, setSeoOgImage] = useState("")
  const ogImageInputRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()

  async function handleOgImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (file.size > 300 * 1024) {
      toast({
        title: "Image trop lourde",
        description: "300 Ko maximum. Veuillez compresser l'image (1200×630 recommandé).",
        variant: "destructive",
      })
      return
    }
    setOgImageUploading(true)
    try {
      const url = await uploadImage(file)
      setSeoOgImage(url)
    } catch {
      toast({ title: "Erreur", description: "Impossible de lire ce fichier.", variant: "destructive" })
    } finally {
      setOgImageUploading(false)
    }
  }

  // Upload d'image vers Storage, retourne l'URL publique
  async function uploadImage(file: File) {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("folder", "assets")
    const res = await fetch("/api/uploads", { method: "POST", body: fd })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Erreur inconnue" }))
      throw new Error(data.error || "Impossible de charger l'image.")
    }
    const data = await res.json()
    return data.url
  }

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
          setSeoOgImage(data.seo?.og_image ?? "")
        }

        const resAdv = await fetch("/api/settings/advanced")
        if (resAdv.ok) {
          const adv = await resAdv.json()
          const raw = adv.reservation_duration_minutes
          // 0 est une valeur valide (désactivé) : ne pas utiliser `|| 15`
          const parsed = raw === undefined || raw === null || raw === "" ? 15 : Number(raw)
          setReservationDurationMinutes(Number.isFinite(parsed) ? parsed : 15)
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

  async function saveAdvanced(successMsg: string) {
    setSavingReservation(true)
    try {
      const res = await fetch("/api/settings/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // L'API avancée attend un scalaire plat, PAS un objet imbriqué
        body: JSON.stringify({ reservation_duration_minutes: reservationDurationMinutes }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Save failed")
      }
      toast({ title: "Paramètre enregistré", description: successMsg })
    } catch (error) {
      console.error("[settings] save advanced error:", error)
      toast({ title: "Erreur", description: "Impossible d'enregistrer ce paramètre.", variant: "destructive" })
    } finally {
      setSavingReservation(false)
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
        description="Redirige tous les visiteurs du site public vers une page de maintenance. Le back-office (/admin) reste accessible pour que vous puissiez le désactiver."
        footer={
          <SettingsButton
            loading={savingMaintenance}
            onClick={() =>
              save(
                "maintenance",
                { enabled: maintenanceEnabled, message: maintenanceMessage },
                setSavingMaintenance,
                maintenanceEnabled ? "Mode maintenance activé : le site public redirige les visiteurs vers la page de maintenance." : "Mode maintenance désactivé.",
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

      {/* Réservation */}
      <SettingsCard
        icon={<Wrench size={20} className="text-neutral-700" />}
        title="Réservation de panier"
        description="Configurez la durée de réserve des articles dans le panier avant d'être facturés."
        footer={
          <SettingsButton
            loading={savingReservation}
            onClick={() => saveAdvanced("Paramètres de réservation enregistrés.")}
          >
            Enregistrer
          </SettingsButton>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Durée de réservation (minutes)
            </label>
            <input
              type="number"
              min="0"
              max="1440"
              value={reservationDurationMinutes}
              onChange={(e) => setReservationDurationMinutes(Number(e.target.value))}
              className={inputClass}
            />
            <p className="text-xs text-neutral-400 mt-1">
              {reservationDurationMinutes === 0
                ? "Désactivé : le stock est déduit immédiatement, sans délai d'expiration."
                : reservationDurationMinutes === 15
                  ? "15 minutes"
                  : `${reservationDurationMinutes} minutes`}
            </p>
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
                { title: seoTitle, description: seoDescription, og_image: seoOgImage },
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
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Image de partage <span className="font-normal text-neutral-400">(WhatsApp, Facebook — 1200×630 recommandé)</span>
            </label>
            <div className="flex items-center gap-4">
              {seoOgImage ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={seoOgImage}
                    alt="Aperçu de partage"
                    className="h-20 w-auto max-w-[240px] object-cover bg-neutral-50 rounded-lg border border-neutral-200"
                  />
                  <button
                    onClick={() => setSeoOgImage("")}
                    className="absolute -top-2 -right-2 p-1 bg-[var(--color-danger)] text-white rounded-full hover:bg-[var(--color-danger-dark)]"
                    title="Supprimer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-36 bg-neutral-50 border border-dashed border-neutral-300 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                  Aucune image
                </div>
              )}
              <button
                type="button"
                onClick={() => ogImageInputRef.current?.click()}
                disabled={ogImageUploading}
                className="px-3 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition opacity-70 cursor-not-allowed"
              >
                {ogImageUploading ? "Chargement…" : "Choisir"}
              </button>
              <input
                ref={ogImageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleOgImageChange}
              />
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}
