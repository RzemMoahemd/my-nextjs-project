"use client"

import Link from "next/link"
import { Instagram, Facebook, Mail, Phone } from "lucide-react"
import { useSettings } from "@/components/settings-provider"

function waLink(raw: string) {
  const digits = (raw || "").replace(/[^\d]/g, "")
  return digits ? `https://wa.me/${digits}` : ""
}

export function Footer() {
  // Paramètres fournis par le layout (rendu serveur) : valeurs correctes
  // dès le premier affichage, sans fetch ni clignotement.
  const { store_info: info, shipping_msg } = useSettings()

  const wa = waLink(info.whatsapp)

  return (
    <footer className="bg-neutral-900 text-neutral-100 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="font-bold text-lg mb-2">{info.name}</h3>
            <p className="text-neutral-400 text-sm">{info.description}</p>
            {(info.address || shipping_msg?.delay || shipping_msg?.return_policy) && (
              <ul className="mt-3 space-y-1 text-xs text-neutral-400">
                {info.address && <li>📍 {info.address}</li>}
                {shipping_msg?.delay && <li>🚚 Livraison : {shipping_msg.delay}</li>}
                {shipping_msg?.return_policy && <li>↩️ {shipping_msg.return_policy}</li>}
              </ul>
            )}
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/products" className="text-neutral-400 hover:text-white transition">
                  Produits
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-neutral-400 hover:text-white transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Social & contact */}
          <div>
            <h4 className="font-semibold mb-4">Suivez-nous</h4>
            <div className="flex gap-4 mb-4">
              {info.instagram && (
                <a
                  href={info.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-white transition"
                  aria-label="Instagram"
                >
                  <Instagram size={20} />
                </a>
              )}
              {info.facebook && (
                <a
                  href={info.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-white transition"
                  aria-label="Facebook"
                >
                  <Facebook size={20} />
                </a>
              )}
            </div>
            <ul className="space-y-2 text-sm">
              {info.email && (
                <li>
                  <a
                    href={`mailto:${info.email}`}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition"
                  >
                    <Mail size={14} />
                    {info.email}
                  </a>
                </li>
              )}
              {wa && (
                <li>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition"
                  >
                    <Phone size={14} />
                    {info.whatsapp}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-6 text-center text-sm text-neutral-500">
          © {new Date().getFullYear()} {info.name}. Tous droits réservés.
        </div>
      </div>
    </footer>
  )
}
