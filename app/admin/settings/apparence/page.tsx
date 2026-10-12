"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { SettingsCard, SettingsButton } from "@/components/admin/settings-card"
import { Palette } from "lucide-react"

const FONTS = ["Geist", "Inter", "Poppins", "Montserrat", "Roboto", "Playfair Display"]

export default function AdminSettingsApparencePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [primaryColor, setPrimaryColor] = useState("#171717")
  const [secondaryColor, setSecondaryColor] = useState("#64748B")
  const [accentColor, setAccentColor] = useState("#F59E0B")
  const [fontFamily, setFontFamily] = useState("Geist")

  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/general")
        if (res.ok) {
          const data = await res.json()
          setPrimaryColor(data.appearance?.primary_color ?? "#171717")
          setSecondaryColor(data.appearance?.secondary_color ?? "#64748B")
          setAccentColor(data.appearance?.accent_color ?? "#F59E0B")
          setFontFamily(data.appearance?.font_family ?? "Geist")
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
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            accent_color: accentColor,
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

  const colors = [
    { label: "Couleur principale", value: primaryColor, set: setPrimaryColor },
    { label: "Couleur secondaire", value: secondaryColor, set: setSecondaryColor },
    { label: "Couleur d'accent", value: accentColor, set: setAccentColor },
  ]

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
          <div className="grid sm:grid-cols-3 gap-4">
            {colors.map((c) => (
              <div key={c.label}>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{c.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={c.value}
                    onChange={(e) => c.set(e.target.value)}
                    className="h-10 w-12 rounded border border-neutral-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={c.value}
                    onChange={(e) => c.set(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
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
            <p className="text-sm text-neutral-500 mb-2">Aperçu :</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: primaryColor, fontFamily: fontFamily }}
              >
                Bouton principal
              </span>
              <span
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: secondaryColor, fontFamily: fontFamily }}
              >
                Secondaire
              </span>
              <span
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: accentColor, fontFamily: fontFamily }}
              >
                Accent
              </span>
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}
