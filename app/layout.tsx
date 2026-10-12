import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { CartProvider } from "@/components/cart-provider"
import { Toaster } from "@/components/ui/toaster"
import { loadSettings } from "@/lib/settings-server"
import { SettingsProvider } from "@/components/settings-provider"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

// Métadonnées dynamiques : titre/description depuis les réglages SEO
// (Paramètres > Avancé), favicon depuis le logo uploadé (Paramètres > Boutique).
export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await loadSettings()

    return {
      metadataBase: new URL("https://elegance-store.vercel.app"),
      title: settings.seo?.title || "ELEGANCE - Boutique de Vêtements",
      description:
        settings.seo?.description ||
        "Découvrez notre collection de vêtements de qualité, stylés et intemporels.",
      keywords: settings.seo?.keywords || "vêtements, fashion, boutique en ligne",
      robots: "index, follow",
      icons: settings.store_info?.favicon_url
        ? { icon: settings.store_info.favicon_url }
        : undefined,
      openGraph: {
        type: "website",
        locale: "fr_FR",
        url: "https://elegance-store.vercel.app",
        title: settings.seo?.title || "ELEGANCE - Boutique de Vêtements",
        description: "Collection de vêtements de qualité et intemporels",
        images: [
          {
            url: "/og-image.jpg",
            width: 1200,
            height: 630,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: settings.seo?.title || "ELEGANCE - Boutique de Vêtements",
        description: "Collection de vêtements de qualité et intemporels",
      },
      generator: "v0.app",
    }
  } catch {
    return {
      title: "ELEGANCE - Boutique de Vêtements",
      description: "Découvrez notre collection de vêtements de qualité, stylés et intemporels.",
    }
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Parametres lus une seule fois cote serveur et partages via le contexte :
  // navbar, footer, panier et fiches produit affichent les vraies valeurs
  // des le premier rendu (plus de clignotement ni de valeurs en dur).
  const settings = await loadSettings()

  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={`font-sans antialiased bg-white text-foreground`}>
        <SettingsProvider settings={settings}>
          <CartProvider>
            {children}
          </CartProvider>
        </SettingsProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
