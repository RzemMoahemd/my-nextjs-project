// =================================================
// MODE MAINTENANCE — lecture pour le middleware
// =================================================
//
// Le middleware (proxy.js) doit pouvoir décider, AVANT le rendu, s'il faut
// rediriger les visiteurs vers /maintenance. On interroge donc la table
// `settings` (clé "maintenance") via l'API REST Supabase, sans dépendre du
// client complet (léger, compatible Edge runtime).
//
// IMPORTANT — fail-open : en cas d'erreur (Supabase injoignable, timeout,
// variable manquante...), on considère la maintenance DÉSACTIVÉE afin de ne
// jamais bloquer l'accès au site à cause d'un problème technique.

export interface MaintenanceState {
  enabled: boolean
  message: string
}

const DEFAULT_MESSAGE =
  "Notre boutique est temporairement en maintenance. Revenez très bientôt !"

/**
 * Retourne l'état du mode maintenance.
 * `null` n'est jamais renvoyé : en cas de problème, on retombe sur
 * `{ enabled: false }` (fail-open).
 */
export async function getMaintenanceState(): Promise<MaintenanceState> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return { enabled: false, message: DEFAULT_MESSAGE }
  }

  try {
    const endpoint = `${url}/rest/v1/settings?select=value&key=eq.maintenance`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeout)

    if (!res.ok) {
      return { enabled: false, message: DEFAULT_MESSAGE }
    }

    const rows = (await res.json()) as Array<{ value?: unknown }>
    const value = rows?.[0]?.value as { enabled?: unknown; message?: unknown } | undefined

    return {
      enabled: Boolean(value?.enabled),
      message:
        typeof value?.message === "string" && value.message.trim()
          ? value.message
          : DEFAULT_MESSAGE,
    }
  } catch {
    // Fail-open : on ne bloque jamais le site à cause d'une erreur de lecture.
    return { enabled: false, message: DEFAULT_MESSAGE }
  }
}

/**
 * Indique si un chemin doit être exclu du blocage maintenance
 * (back-office, API, page de maintenance elle-même, assets Next.js).
 */
export function isMaintenanceExempt(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/maintenance" ||
    pathname === "/favicon.ico"
  )
}
