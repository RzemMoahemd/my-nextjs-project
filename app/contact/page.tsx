import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Instagram, Mail } from "lucide-react"

export const metadata = {
  title: "Contactez-nous | ELEGANCE",
  description: "Nous contacter via Instagram ou email.",
}

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">Nous contacter</h1>
            <p className="text-neutral-600 text-lg">Nous sommes là pour répondre à vos questions et vous aider.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border-2 border-neutral-200 rounded-lg p-8 text-center hover:border-pink-600 hover:bg-pink-50 transition"
            >
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Instagram size={32} className="text-pink-600" />
              </div>
              <h3 className="font-bold text-lg text-neutral-900 mb-2">Instagram</h3>
              <p className="text-neutral-600 mb-4">Suivez-nous pour découvrir les dernières nouveautés.</p>
              <span className="text-pink-600 font-semibold">Suivre notre compte</span>
            </a>

            {/* Email */}
            <a
              href="mailto:contact@elegance.com"
              className="bg-white border-2 border-neutral-200 rounded-lg p-8 text-center hover:border-blue-600 hover:bg-blue-50 transition"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={32} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-neutral-900 mb-2">Email</h3>
              <p className="text-neutral-600 mb-4">Pour les demandes plus spécifiques ou les partenariats.</p>
              <span className="text-blue-600 font-semibold">Envoyer un email</span>
            </a>
          </div>

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
                  Les délais varient selon votre localisation. Nous vous les confirmerons au moment de la commande par téléphone.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">Acceptez-vous les retours ?</h3>
                <p className="text-neutral-700">
                  Oui, nous acceptons les retours sous 14 jours. Contactez-nous par email ou téléphone pour plus d'informations.
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
