import { loadSettings } from "@/lib/settings-server"
import { FreeShippingBanner } from "@/components/free-shipping-banner"
import { HomeContent } from "@/components/home-content"

// Page d'accueil (Server Component) : les parametres sont lus cote serveur
// afin que la banniere de livraison affiche immediatement les bonnes valeurs
// (texte personnalise + seuil reel), sans clignotement au chargement.
// Le client admin (service role) est requis : la table settings est protegee
// par RLS et n'est pas lisible avec la cle anonyme.
// force-dynamic : la banniere est relue en base a chaque visite afin que les
// changements de parametres (texte, seuil) soient visibles immediatement.
export const dynamic = "force-dynamic"

export default async function Home() {
  const settings = await loadSettings()

  return (
    <>
      <FreeShippingBanner settings={settings} />
      <HomeContent shippingDelay={settings.shipping_msg?.delay} homepage={settings.homepage} />
    </>
  )
}