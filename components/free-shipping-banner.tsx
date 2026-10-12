import type { AllSettings } from "@/lib/settings"

// Banniere "Livraison gratuite" - rendue cote SERVEUR.
// Les valeurs viennent directement des parametres en base : aucun flash
// (ancienne valeur 140 puis 134) car le HTML est correct des le 1er octet.
export function FreeShippingBanner({ settings }: { settings: AllSettings }) {
  const msg = settings.shipping_msg
  const free = settings.free_shipping

  // Banniere desactivee dans les parametres admin
  if (!msg?.banner_enabled) return null

  // Montant du seuil ajoute uniquement si la livraison gratuite est active
  const amount = free?.enabled && free.threshold > 0 ? ` ${free.threshold} DT` : ""

  return (
    <section className="bg-neutral-800 text-white py-2 text-center text-sm font-medium">
      {msg.banner_text}
      {amount}
    </section>
  )
}