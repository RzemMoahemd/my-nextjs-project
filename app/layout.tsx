import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { CartProvider } from "@/components/cart-provider"
import { Toaster } from "@/components/ui/toaster"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ELEGANCE - Boutique de Vêtements | Instagram Store",
  description:
    "Découvrez notre collection de vêtements de qualité, stylés et intemporels. Commandez directement en ligne.",
  keywords: "vêtements, fashion, boutique en ligne, Instagram shopping",
  robots: "index, follow",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://elegance-store.vercel.app",
    title: "ELEGANCE - Boutique de Vêtements",
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
    title: "ELEGANCE - Boutique de Vêtements",
    description: "Collection de vêtements de qualité et intemporels",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={`font-sans antialiased bg-white text-foreground`}>
        <CartProvider>
          {children}
        </CartProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
