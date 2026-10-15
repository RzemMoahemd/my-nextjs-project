"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Store, Truck, Palette, ShoppingCart, Settings2, LogOut, ArrowLeft } from "lucide-react"

const TABS = [
  { href: "/admin/settings", label: "Livraison", icon: Truck, exact: true },
  { href: "/admin/settings/boutique", label: "Boutique", icon: Store },
  { href: "/admin/settings/apparence", label: "Apparence", icon: Palette },
  { href: "/admin/settings/vente", label: "Vente", icon: ShoppingCart },
  { href: "/admin/settings/avance", label: "Avancé", icon: Settings2 },
]

export function SettingsTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  const isActive = (tab: (typeof TABS)[number]) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)

  return (
    <>
      {/* Header */}
      <header className="bg-[var(--color-primary)] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="p-2 rounded-lg hover:bg-[var(--color-primary-dark)] transition"
              title="Retour au dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Paramètres</h1>
              <p className="text-xs text-neutral-400">Configuration de la boutique</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-[var(--color-primary-dark)] transition"
            >
              Voir le site
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-[var(--color-primary-dark)] transition"
              title="Déconnexion"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Onglets */}
      <nav className="bg-white border-b border-neutral-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const active = isActive(tab)
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? "border-[var(--color-primary)] text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
