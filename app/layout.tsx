import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Inter, Poppins, Montserrat, Roboto, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { CartProvider } from "@/components/cart-provider"
import { Toaster } from "@/components/ui/toaster"
import { loadSettings } from "@/lib/settings-server"
import { SettingsProvider } from "@/components/settings-provider"

// Polices disponibles (selectionnables dans Parametres > Apparence)
const _geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-poppins" })
const _montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" })
const _roboto = Roboto({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-roboto" })
const _playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" })

const FONT_STACKS: Record<string, string> = {
  Geist: "var(--font-geist)",
  Inter: "var(--font-inter)",
  Poppins: "var(--font-poppins)",
  Montserrat: "var(--font-montserrat)",
  Roboto: "var(--font-roboto)",
  "Playfair Display": "var(--font-playfair)",
}

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
  const appearance = settings.appearance

  // Couleurs de la boutique injectees en variables CSS des le premier octet :
  // les composants les utilisent via var(--color-*) — aucun clignotement.
  // Version assombrie (-dark) des couleurs, pour les etats hover des boutons.
function darkenHex(hex: string, amount = 0.15): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return hex
  const ch = (v: string) =>
    Math.max(0, Math.round(parseInt(v, 16) * (1 - amount)))
      .toString(16)
      .padStart(2, "0")
  return `#${ch(m[1])}${ch(m[2])}${ch(m[3])}`
}

const primaryColor = appearance?.primary_color || "#171717"
const secondaryColor = appearance?.secondary_color || "#2563EB"
const dangerColor = appearance?.danger_color || "#DC2626"
const successColor = appearance?.success_color || "#16A34A"

const themeVars = {
  "--color-primary": primaryColor,
  "--color-primary-dark": darkenHex(primaryColor),
  "--color-secondary": secondaryColor,
  "--color-secondary-dark": darkenHex(secondaryColor),
  "--color-banner": appearance?.banner_color || "#262626",
  "--color-accent": appearance?.accent_color || "#F59E0B",
  "--color-success": successColor,
  "--color-success-dark": darkenHex(successColor),
  "--color-danger": dangerColor,
  "--color-danger-dark": darkenHex(dangerColor),
  fontFamily: FONT_STACKS[appearance?.font_family] || "var(--font-geist)",
} as React.CSSProperties

  return (
    <html
      lang="fr"
      className={`${_geist.variable} ${_inter.variable} ${_poppins.variable} ${_montserrat.variable} ${_roboto.variable} ${_playfair.variable}`}
      style={themeVars}
    >
      <head>
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="antialiased bg-white text-foreground">
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
