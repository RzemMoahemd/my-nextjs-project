"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { SettingsCard, SettingsButton } from "@/components/admin/settings-card"
import { Truck, Package, Clock } from "lucide-react"

export default function AdminSettingsShippingPage() {
  const [loading, setLoading] = useState(true)
  const [savingDelivery, setSavingDelivery] = useState(false)
  const [savingShipping, setSavingShipping] = useState(false)
  const [savingMsg, setSavingMsg] = useState(false)

  const [deliveryFee, setDeliveryFee] = useState("7")
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("140")
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(true)

  const [bannerEnabled, setBannerEnabled] = useState(true)
  const [bannerText, setBannerText] = useState("Livraison gratuite à partir de")
  const [delay, setDelay] = useState("2 à 4 jours ouvrés")
  const [returnPolicy, setReturnPolicy] = useState("Retours acceptés sous 7 jours")

  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/general")
        if (res.ok) {
          const data = await res.json()
          setDeliveryFee(String(data.delivery_fee?.amount ?? 7))
          setFreeShippingThreshold(String(data.free_shipping?.threshold ?? 140))
          setFreeShippingEnabled(Boolean(data.free_shipping?.enabled ?? true))
          setBannerEnabled(Boolean(data.shipping_msg?.banner_enabled ?? true))
          setBannerText(data.shipping_msg?.banner_text ?? "Livraison gratuite à partir de")
          setDelay(data.shipping_msg?.delay ?? "2 à 4 jours ouvrés")
          setReturnPolicy(data.shipping_msg?.return_policy ?? "Retours acceptés sous 7 jours")
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
      {/* Frais de livraison */}
      <SettingsCard
        icon={<Truck size={20} className="text-neutral-700" />}
        title="Frais de livraison"
        description="Montant fixe ajouté au total de la commande"
        footer={
          <SettingsButton
            loading={savingDelivery}
            onClick={() =>
              save(
                "delivery_fee",
                { amount: Number(deliveryFee) || 0 },
                setSavingDelivery,
                `Frais de livraison : ${deliveryFee} DT`,
              )
            }
          >
            Enregistrer
          </SettingsButton>
        }
      >
        <label className="block text-sm font-medium text-neutral-700 mb-1">Montant (DT)</label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={deliveryFee}
          onChange={(e) => setDeliveryFee(e.target.value)}
          className={`${inputClass} sm:max-w-xs`}
        />
      </SettingsCard>

      {/* Livraison gratuite */}
      <SettingsCard
        icon={<Package size={20} className="text-neutral-700" />}
        title="Livraison gratuite"
        description="Offerte automatiquement au-delà d'un montant d'achat"
        footer={
          <SettingsButton
            loading={savingShipping}
            onClick={() =>
              save(
                "free_shipping",
                { threshold: Number(freeShippingThreshold) || 0, enabled: freeShippingEnabled },
                setSavingShipping,
                freeShippingEnabled
                  ? `Gratuite dès ${freeShippingThreshold} DT d'achat.`
                  : "Livraison gratuite désactivée.",
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
              checked={freeShippingEnabled}
              onChange={(e) => setFreeShippingEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700">Activer la livraison gratuite</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Seuil (DT) — gratuit à partir de ce montant
            </label>
            <input
              type="number"
              min="0"
              value={freeShippingThreshold}
              disabled={!freeShippingEnabled}
              onChange={(e) => setFreeShippingThreshold(e.target.value)}
              className={`${inputClass} sm:max-w-xs disabled:bg-neutral-100`}
            />
          </div>
        </div>
      </SettingsCard>
      {/* Message / délais */}
      <SettingsCard
        icon={<Clock size={20} className="text-neutral-700" />}
        title="Message de livraison"
        description="Bannière d'accueil, délai annoncé et politique de retour"
        footer={
          <SettingsButton
            loading={savingMsg}
            onClick={() =>
              save(
                "shipping_msg",
                { banner_enabled: bannerEnabled, banner_text: bannerText, delay, return_policy: returnPolicy },
                setSavingMsg,
                "Message de livraison mis à jour.",
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
              checked={bannerEnabled}
              onChange={(e) => setBannerEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700">Afficher la bannière sur l'accueil</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Texte de la bannière</label>
            <input
              type="text"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Délai de livraison</label>
              <input
                type="text"
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Politique de retour</label>
              <input
                type="text"
                value={returnPolicy}
                onChange={(e) => setReturnPolicy(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </SettingsCard>

    </div>
  )
}
