"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { SettingsCard, SettingsButton } from "@/components/admin/settings-card"
import { Store, Upload, X } from "lucide-react"

interface StoreInfo {
  name: string
  description: string
  email: string
  whatsapp: string
  instagram: string
  facebook: string
  address: string
  logo_url: string
  favicon_url: string
}

const MAX_FILE_SIZE = 300 * 1024 // 300 Ko

export default function AdminSettingsBoutiquePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<StoreInfo>({
    name: "",
    description: "",
    email: "",
    whatsapp: "",
    instagram: "",
    facebook: "",
    address: "",
    logo_url: "",
    favicon_url: "",
  })

  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/general")
        if (res.ok) {
          const data = await res.json()
          setForm((prev) => ({ ...prev, ...(data.store_info || {}) }))
        }
      } catch (error) {
        console.error("[settings] load error:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>, field: "logo_url" | "favicon_url") {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Image trop lourde",
        description: "300 Ko maximum. Veuillez compresser l'image.",
        variant: "destructive",
      })
      return
    }

    try {
      // Upload vers Supabase Storage, récupération de l'URL publique
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "assets")
      const res = await fetch("/api/uploads", { method: "POST", body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Erreur inconnue" }))
        throw new Error(data.error || "Impossible de charger l'image.")
      }
      const data = await res.json()
      setForm((prev) => ({ ...prev, [field]: data.url }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast({ title: "Erreur", description: message, variant: "destructive" })
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_info: form }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Boutique mise à jour", description: "Les informations ont été enregistrées." })
    } catch (error) {
      console.error("[settings] save error:", error)
      toast({ title: "Erreur", description: "Impossible d'enregistrer.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]" />
      </div>
    )
  }

  const inputClass =
    "w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"

  return (
    <div className="space-y-6">
      {/* Informations */}
      <SettingsCard
        icon={<Store size={20} className="text-neutral-700" />}
        title="Informations de la boutique"
        description="Identité et coordonnées affichées sur le site"
        footer={
          <SettingsButton loading={saving} onClick={handleSave}>
            Enregistrer
          </SettingsButton>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nom de la boutique</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email de contact</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">WhatsApp</label>
            <input
              type="text"
              name="whatsapp"
              value={form.whatsapp}
              onChange={handleChange}
              placeholder="+216 XX XXX XXX"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Adresse</label>
            <input type="text" name="address" value={form.address} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram (URL)</label>
            <input
              type="url"
              name="instagram"
              value={form.instagram}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Facebook (URL)</label>
            <input
              type="url"
              name="facebook"
              value={form.facebook}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>
      </SettingsCard>
      {/* Description & images de marque */}
      <SettingsCard
        icon={<Upload size={20} className="text-neutral-700" />}
        title="Description & Logo"
        description="Texte du footer, logo et favicon — 300 Ko maximum"
        footer={
          <SettingsButton loading={saving} onClick={handleSave}>
            Enregistrer
          </SettingsButton>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Description (footer)</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className={inputClass}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Logo</label>
              <div className="flex items-center gap-4">
                {form.logo_url ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.logo_url}
                      alt="Logo"
                      className="h-16 w-auto max-w-[160px] object-contain bg-neutral-50 rounded-lg border border-neutral-200 p-1"
                    />
                    <button
                      onClick={() => setForm((prev) => ({ ...prev, logo_url: "" }))}
                      className="absolute -top-2 -right-2 p-1 bg-[var(--color-danger)] text-white rounded-full hover:bg-[var(--color-danger-dark)]"
                      title="Supprimer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-32 bg-neutral-50 border border-dashed border-neutral-300 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                    Aucun logo
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition"
                >
                  Choisir
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, "logo_url")}
                />
              </div>
            </div>

            {/* Favicon */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Favicon</label>
              <div className="flex items-center gap-4">
                {form.favicon_url ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.favicon_url}
                      alt="Favicon"
                      className="h-8 w-8 object-contain bg-neutral-50 rounded border border-neutral-200 p-0.5"
                    />
                    <button
                      onClick={() => setForm((prev) => ({ ...prev, favicon_url: "" }))}
                      className="absolute -top-2 -right-2 p-1 bg-[var(--color-danger)] text-white rounded-full hover:bg-[var(--color-danger-dark)]"
                      title="Supprimer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="h-8 w-8 bg-neutral-50 border border-dashed border-neutral-300 rounded flex items-center justify-center text-[10px] text-neutral-400">
                    —
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => faviconInputRef.current?.click()}
                  className="px-3 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition"
                >
                  Choisir
                </button>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/png,image/x-icon,image/svg+xml"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, "favicon_url")}
                />
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>

    </div>
  )
}
