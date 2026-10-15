"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { SettingsCard, SettingsButton } from "@/components/admin/settings-card"
import { Palette } from "lucide-react"

const FONTS = ["Geist", "Inter", "Poppins", "Montserrat", "Roboto", "Playfair Display"]

const COLOR_FIELDS = [
  {
    key: "primary_color",
    label: "Couleur des boutons principaux",
    hint: "Ajouter au panier, Passer au paiement, Connexion, Enregistrer",
    default: "#171717",
  },
  {
    key: "secondary_color",
    label: "Couleur des boutons secondaires",
    hint: "Acheter maintenant et actions secondaires",
    default: "#2563EB",
  },
  {
    key: "banner_color",
    label: "Couleur des bandeaux",
    hint: "Bannière « Livraison gratuite » et en-têtes sombres",
    default: "#262626",
  },
  {
    key: "accent_color",
    label: "Couleur d'accent",
    hint: "Prix remisés et mise en valeur",
    default: "#F59E0B",
  },
  {
    key: "success_color",
    label: "Couleur de succès",
    hint: "Disponible, livraison gratuite, coupon valide",
    default: "#16A34A",
  },
  {
    key: "danger_color",
    label: "Couleur d'erreur",
    hint: "Rupture de stock, suppression, alertes",
    default: "#DC2626",
  },
] as const

export default function AdminSettingsApparencePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [colors, setColors] = useState<Record<string, string>>({
    primary_color: "#171717",
    secondary_color: "#2563EB",
    banner_color: "#262626",
    accent_color: "#F59E0B",
    success_color: "#16A34A",
    danger_color: "#DC2626",
  })
  const [fontFamily, setFontFamily] = useState("Geist")

  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/general")
        if (res.ok) {
          const data = await res.json()
          if (data.appearance) {
            setColors((prev) => ({ ...prev, ...data.appearance }))
            setFontFamily(data.appearance.font_family ?? "Geist")
          }
        }
      } catch (error) {
        console.error("[settings] load error:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appearance: {
            ...colors,
            font_family: fontFamily,
          },
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Apparence enregistrée", description: "Les couleurs et la police ont été sauvegardées." })
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={<Palette size={20} className="text-neutral-700" />}
        title="Identité visuelle"
        description="Couleurs et police utilisées par la boutique"
        footer={
          <SettingsButton loading={saving} onClick={handleSave}>
            Enregistrer
          </SettingsButton>
        }
      >
        <div className="space-y-6">
          {/* Couleurs */}
          <div className="grid sm:grid-cols-2 gap-4">
            {COLOR_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {field.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[field.key] || field.default}
                    onChange={(e) =>
                      setColors((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="h-10 w-12 rounded border border-neutral-300 cursor-pointer p-0.5 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={colors[field.key] || field.default}
                    onChange={(e) =>
                      setColors((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-1">{field.hint}</p>
              </div>
            ))}
          </div>

          {/* Police */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Police de caractères</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full sm:max-w-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Aperçu */}
          <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
            <p className="text-sm text-neutral-500 mb-3">Aperçu :</p>
            <div
              className="text-white text-sm text-center py-2 rounded mb-3"
              style={{ backgroundColor: colors.banner_color }}
            >
              Bandeau (livraison, en-têtes)
            </div>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <span
                className="px-4 py-2 text-white text-sm font-semibold rounded-lg"
                style={{ backgroundColor: colors.primary_color, fontFamily }}
              >
                Bouton principal
              </span>
              <span
                className="px-4 py-2 text-white text-sm font-semibold rounded-lg"
                style={{ backgroundColor: colors.secondary_color, fontFamily }}
              >
                Bouton secondaire
              </span>
              <span
                className="px-4 py-2 text-white text-sm font-semibold rounded-lg"
                style={{ backgroundColor: colors.accent_color, fontFamily }}
              >
                Accent
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm" style={{ fontFamily }}>
              <span style={{ color: colors.success_color }}>✓ Succès (disponible)</span>
              <span style={{ color: colors.danger_color }}>✗ Erreur (rupture)</span>
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}
