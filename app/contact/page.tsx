import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Instagram, Mail, MessageCircle, MapPin, Facebook } from "lucide-react"
import { loadSettings } from "@/lib/settings-server"

export const metadata = {
  title: "Contactez-nous | ELEGANCE",
  description: "Nous contacter via Instagram, WhatsApp ou email.",
}

export default async function ContactPage() {
  const settings = await loadSettings()
  const info = settings.store_info
  const wa = info.whatsapp ? `https://wa.me/${info.whatsapp.replace(/[^\d]/g, "")}` : ""

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">Nous contacter</h1>
            <p className="text-neutral-600 text-lg">Nous sommes là pour répondre à vos questions et vous aider.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            {/* Instagram */}
            <a
              href={info.instagram || "https://instagram.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border-2 border-neutral-200 rounded-lg p-6 text-center hover:border-pink-600 hover:bg-pink-50 transition"
            >
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Instagram size={32} className="text-pink-600" />
              </div>
              <h3 className="font-bold text-lg text-neutral-900 mb-2">Instagram</h3>
              <p className="text-neutral-600 mb-4">Suivez-nous pour découvrir les dernières nouveautés.</p>
              <span className="text-pink-600 font-semibold">Suivre notre compte</span>
            </a>

            {/* Facebook */}
            {info.facebook && (
              <a
                href={info.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border-2 border-neutral-200 rounded-lg p-6 text-center hover:border-blue-700 hover:bg-blue-50 transition"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Facebook size={32} className="text-blue-700" />
                </div>
                <h3 className="font-bold text-lg text-neutral-900 mb-2">Facebook</h3>
                <p className="text-neutral-600 mb-4">Retrouvez-nous aussi sur Facebook.</p>
                <span className="text-blue-700 font-semibold">Voir notre page</span>
              </a>
            )}

            {/* WhatsApp */}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border-2 border-neutral-200 rounded-lg p-6 text-center hover:border-green-600 hover:bg-green-50 transition"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle size={32} className="text-green-600" />
                </div>
                <h3 className="font-bold text-lg text-neutral-900 mb-2">WhatsApp</h3>
                <p className="text-neutral-600 mb-4">Écrivez-nous directement, on répond vite.</p>
                <span className="text-green-600 font-semibold break-all">{info.whatsapp}</span>
              </a>
            )}

            {/* Email */}
            {info.email && (
              <a
                href={`mailto:${info.email}`}
                className="bg-white border-2 border-neutral-200 rounded-lg p-6 text-center hover:border-blue-600 hover:bg-blue-50 transition"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={32} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-lg text-neutral-900 mb-2">Email</h3>
                <p className="text-neutral-600 mb-4">Pour les demandes plus spécifiques ou les partenariats.</p>
                <span className="text-blue-600 font-semibold break-all">{info.email}</span>
              </a>
            )}
          </div>

          {/* Adresse (affichage discret) */}
          {info.address && (
            <div className="flex justify-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-full text-sm text-neutral-600">
                <MapPin size={14} className="text-neutral-400 flex-shrink-0" />
                <span>{info.address}</span>
              </div>
            </div>
          )}

          {/* FAQ Section */}
          <div className="bg-neutral-50 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-6">Questions fréquentes</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Comment commander ?</h3>
                <p className="text-neutral-700">
                  Sélectionnez un produit, choisissez votre taille, et ajoutez-le à votre panier. Vous pourrez ensuite finaliser votre commande en remplissant vos informations de contact.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Quels sont les délais de livraison ?</h3>
                <p className="text-neutral-700">
                  {settings.shipping_msg?.delay || "Les délais varient selon votre localisation. Nous vous les confirmerons au moment de la commande par téléphone."}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Acceptez-vous les retours ?</h3>
                <p className="text-neutral-700">
                  {settings.shipping_msg?.return_policy || "Oui, contactez-nous par email ou téléphone pour plus d'informations."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
