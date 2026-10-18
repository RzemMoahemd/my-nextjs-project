"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { SettingsCard, SettingsButton } from "@/components/admin/settings-card"
import { Home, X } from "lucide-react"

interface HomepageForm {
  hero_title: string
  hero_subtitle: string
  hero_button_text: string
  hero_image_url: string
  collections_title: string
  collections_subtitle: string
  new_title: string
  new_subtitle: string
  new_button_text: string
  feature1_title: string
  feature1_text: string
  feature2_title: string
  feature2_text: string
  feature3_title: string
  feature3_text: string
  category_images: Record<string, string>
}

const MAX_FILE_SIZE = 5 * 1024 * 1024

export default function AdminSettingsAccueilPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [heroUploading, setHeroUploading] = useState(false)
  const [categoryUploading, setCategoryUploading] = useState(false)

  const [form, setForm] = useState<HomepageForm>({
    hero_title: "",
    hero_subtitle: "",
    hero_button_text: "",
    hero_image_url: "",
    collections_title: "",
    collections_subtitle: "",
    new_title: "",
    new_subtitle: "",
    new_button_text: "",
    feature1_title: "",
    feature1_text: "",
    feature2_title: "",
    feature2_text: "",
    feature3_title: "",
    feature3_text: "",
    category_images: {},
  })

  const [topCategories, setTopCategories] = useState<string[]>([])

  const heroInputRef = useRef<HTMLInputElement>(null)
  const catInputRef = useRef<HTMLInputElement>(null)
  const [pendingCategory, setPendingCategory] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/general")
        if (res.ok) {
          const data = await res.json()
          setForm((prev) => ({
            ...prev,
            ...(data.homepage || {}),
            category_images: data.homepage?.category_images || {},
          }))
        }
        // Catégories principales (niveau 1) pour la carte images
        try {
          const cres = await fetch("/api/categories")
          if (cres.ok) {
            const cats = await cres.json()
            const tops = Array.isArray(cats)
              ? cats.filter((c: any) => !c.parent_id).map((c: any) => c.name).filter(Boolean)
              : []
            setTopCategories(tops)
          }
        } catch {
          // silencieux : la carte utilisera les clés déjà enregistrées
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
    const { name, value } = e.target as HTMLInputElement | HTMLTextAreaElement
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ""
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Image trop lourde", description: "5 Mo maximum.", variant: "destructive" })
      return
    }
    setHeroUploading(true)
    try {
      // Upload vers Supabase Storage, récupération de l'URL publique
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "homepage")
      const res = await fetch("/api/uploads", { method: "POST", body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Erreur inconnue" }))
        throw new Error(data.error || "Impossible de charger l'image.")
      }
      const data = await res.json()
      setForm((prev) => ({ ...prev, hero_image_url: data.url }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast({ title: "Erreur", description: message, variant: "destructive" })
    } finally {
      setHeroUploading(false)
    }
  }

  function pickCategoryImage(categoryName: string) {
    setPendingCategory(categoryName)
    catInputRef.current?.click()
  }

  async function handleCategoryImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ""
    const target: string | null = pendingCategory
    if (!file || !target) return
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Image trop lourde", description: "5 Mo maximum.", variant: "destructive" })
      return
    setCategoryUploading(true)
    }
    try {
      // Upload vers Supabase Storage, récupération de l'URL publique
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "categories")
      const res = await fetch("/api/uploads", { method: "POST", body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Erreur inconnue" }))
        throw new Error(data.error || "Impossible de charger l'image.")
      }
      const data = await res.json()
      setForm((prev) => ({
        ...prev,
        category_images: { ...(prev.category_images || {}), [target]: data.url },
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast({ title: "Erreur", description: message, variant: "destructive" })
    } finally {
      setPendingCategory(null)
      setCategoryUploading(false)
    }
  }

  function removeCategoryImage(categoryName: string) {
    setForm((prev) => {
      const next = { ...(prev.category_images || {}) }
      delete next[categoryName]
      return { ...prev, category_images: next }
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Validation client : rejeter les dataURL avant l'envoi
      await validateNoDataUrl(form)
      const res = await fetch("/api/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homepage: form }),
      })
      const data = (await res.json().catch(() => ({ error: "" }))) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error || "Save failed")
      }
      toast({ title: "Accueil mis à jour", description: "Contenu enregistré." })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      console.error("[settings] save error:", error)
      toast({ title: "Erreur", description: message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Vérification : un dataURL dans le formulaire → on bloque l'envoi
  async function validateNoDataUrl(form: HomepageForm) {
    for (const [key, value] of Object.entries(form)) {
      if (typeof value === "string" && isDataUrl(value)) {
        throw new Error(
          `Le champ "${key}" contient une ancienne image (dataURL). ` +
          `Veuillez re-choisir l'image ou vider le champ.`
        )
      }
    }
    // category_images
    if (Object.keys(form.category_images).length > 0) {
      for (const [cat, url] of Object.entries(form.category_images)) {
        if (isDataUrl(url)) {
          throw new Error(
            `L'image de la catégorie "${cat}" contient une ancienne image (dataURL). ` +
            `Veuillez re-choisir l'image.`
          )
        }
      }
    }
  }

  function isDataUrl(value: string): boolean {
    return /^data:[^;]+;base64,[A-Za-z0-9+/=]+$/.test(value)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900" />
      </div>
    )
  }

  const inputClass =
    "w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
  const labelClass = "block text-sm font-medium text-neutral-700 mb-1"

  return (
    <div className="space-y-6">
      {/* Bandeau principal (Hero) */}
      <SettingsCard
        icon={<Home size={20} className="text-neutral-700" />}
        title="Bandeau principal"
        description="Le grand titre en haut de la page d'accueil"
        footer={<SettingsButton loading={saving} onClick={handleSave}>Enregistrer</SettingsButton>}
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Titre principal</label>
            <input type="text" name="hero_title" value={form.hero_title} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Sous-titre</label>
            <textarea name="hero_subtitle" value={form.hero_subtitle} onChange={handleChange} rows={2} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Texte du bouton</label>
            <input type="text" name="hero_button_text" value={form.hero_button_text} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Image de fond</label>
            <div className="flex items-center gap-4">
              {form.hero_image_url ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.hero_image_url} alt="Fond du bandeau" className="h-20 w-auto max-w-[240px] object-cover bg-neutral-50 rounded-lg border border-neutral-200" />
                  <button onClick={() => setForm((prev) => ({ ...prev, hero_image_url: "" }))} className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full" title="Supprimer">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-36 bg-neutral-50 border border-dashed border-neutral-300 rounded-lg flex items-center justify-center text-xs text-neutral-400">Image par défaut</div>
              )}
              <button type="button" onClick={() => heroInputRef.current?.click()} disabled={heroUploading} className="px-3 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition opacity-70 cursor-not-allowed">{heroUploading ? "Chargement…" : "Choisir"}</button>
              <input ref={heroInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageChange} />
            </div>
          </div>
        </div>
      </SettingsCard>
      {/* Titres des sections */}
      <SettingsCard
        icon={<Home size={20} className="text-neutral-700" />}
        title="Titres des sections"
        description="Les titres Collections et Nouveautés"
        footer={<SettingsButton loading={saving} onClick={handleSave}>Enregistrer</SettingsButton>}
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Titre Collections</label>
            <input type="text" name="collections_title" value={form.collections_title} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Sous-titre Collections</label>
            <input type="text" name="collections_subtitle" value={form.collections_subtitle} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Titre Nouveautés</label>
            <input type="text" name="new_title" value={form.new_title} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Sous-titre Nouveautés</label>
            <input type="text" name="new_subtitle" value={form.new_subtitle} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Texte du bouton produits</label>
            <input type="text" name="new_button_text" value={form.new_button_text} onChange={handleChange} className={inputClass} />
          </div>
        </div>
      </SettingsCard>
      {/* Images des collections */}
      <SettingsCard
        icon={<Home size={20} className="text-neutral-700" />}
        title="Images des collections"
        description="Photos des cartes catégories sur l'accueil (vide = image par défaut)"
        footer={<SettingsButton loading={saving} onClick={handleSave}>Enregistrer</SettingsButton>}
      >
        <input ref={catInputRef} type="file" accept="image/*" className="hidden" onChange={handleCategoryImageChange} />
        {(topCategories.length > 0 ? topCategories : Object.keys(form.category_images || {})).length === 0 ? (
          <p className="text-sm text-neutral-500">Aucune catégorie principale pour le moment. Créez des catégories puis revenez ici.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(topCategories.length > 0 ? topCategories : Object.keys(form.category_images || {})).map((name) => {
              const url = (form.category_images || {})[name]
              return (
                <div key={name} className="border border-neutral-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-neutral-900 mb-2">{name}</p>
                  <div className="flex items-center gap-3">
                    {url ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={name} className="h-16 w-12 object-cover rounded-md border border-neutral-200" />
                        <button type="button" onClick={() => removeCategoryImage(name)} className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full" title="Supprimer">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-12 rounded-md border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center text-[10px] text-neutral-400 text-center px-1">
                        Défaut
                      </div>
                    )}
                    <button type="button" onClick={() => pickCategoryImage(name)} disabled={categoryUploading} className="px-4 py-2 bg-neutral-100 text-neutral-800 rounded-lg font-semibold hover:bg-neutral-200 transition opacity-70 cursor-not-allowed">{categoryUploading ? "Chargement…" : url ? "Remplacer" : "Choisir"}</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SettingsCard>
      {/* Blocs avantages */}
      <SettingsCard
        icon={<Home size={20} className="text-neutral-700" />}
        title="Blocs avantages"
        description="Les 3 blocs en bas de page"
        footer={<SettingsButton loading={saving} onClick={handleSave}>Enregistrer</SettingsButton>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bloc 1 — Titre</label>
              <input type="text" name="feature1_title" value={form.feature1_title} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bloc 1 — Texte</label>
              <input type="text" name="feature1_text" value={form.feature1_text} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bloc 2 — Titre</label>
              <input type="text" name="feature2_title" value={form.feature2_title} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bloc 2 — Texte <span className="font-normal text-neutral-400">(vide = texte auto « Livraison en X » depuis la page Livraison)</span></label>
              <input type="text" name="feature2_text" value={form.feature2_text} onChange={handleChange} className={inputClass} placeholder="Laisser vide pour le texte automatique" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bloc 3 — Titre</label>
              <input type="text" name="feature3_title" value={form.feature3_title} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bloc 3 — Texte</label>
              <input type="text" name="feature3_text" value={form.feature3_text} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}

