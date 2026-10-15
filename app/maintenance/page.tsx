import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Wrench } from "lucide-react"
import { getMaintenanceState } from "@/lib/maintenance"
import { createClientComponentClient } from "@/lib/supabase-client"

// Cette page ne doit jamais être indexée par les moteurs de recherche.
export const metadata: Metadata = {
  title: "Maintenance",
  robots: { index: false, follow: false },
}

export default async function MaintenancePage() {
  // Si la maintenance est DÉSACTIVÉE, on ne reste jamais bloqué sur cette page :
  // un visiteur qui la recharge (ou y revient) est renvoyé vers l'accueil.
  // Cohérent avec le fail-open : état indéterminé = considéré désactivé.
  const state = await getMaintenanceState()
  if (!state.enabled) {
    redirect("/")
  }

  const message = state.message

  // Permettre à un administrateur connecté de revenir au back-office.
  let isAdmin = false
  try {
    const supabase = createClientComponentClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()
      isAdmin = Boolean(adminUser)
    }
  } catch {
    // Ignore : on reste sur la page publique.
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ backgroundColor: "var(--color-banner, #262626)" }}
    >
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--color-accent,#F59E0B)]/15">
            <Wrench size={32} className="text-[var(--color-accent,#F59E0B)]" />
          </div>
        </div>

        <h1
          className="text-3xl sm:text-4xl font-bold"
          style={{ color: "var(--color-primary, #171717)" }}
        >
          Maintenance en cours
        </h1>

        <p className="text-base sm:text-lg text-neutral-600 whitespace-pre-line">
          {message}
        </p>

        {isAdmin && (
          <a
            href="/admin"
            className="inline-block mt-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white bg-[var(--color-primary,#171717)] hover:opacity-90 transition-opacity"
          >
            Accéder au back-office
          </a>
        )}

        <p className="text-xs text-neutral-400 pt-4">
          Merci de votre patience.
        </p>
      </div>
    </main>
  )
}
