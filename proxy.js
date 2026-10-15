import { updateSession } from "@/lib/auth-utils"
import { getMaintenanceState, isMaintenanceExempt } from "@/lib/maintenance"
import { NextResponse } from "next/server"

export async function proxy(request) {
  const { pathname } = request.nextUrl

  // Mode maintenance : redirige les visiteurs du front-office vers /maintenance.
  // Le back-office (/admin), l'API, la page de maintenance elle-même et les
  // assets Next.js restent accessibles. Lecture en fail-open (jamais bloquant
  // en cas d'erreur technique).
  if (!isMaintenanceExempt(pathname)) {
    const maintenance = await getMaintenanceState()
    if (maintenance.enabled) {
      const url = request.nextUrl.clone()
      url.pathname = "/maintenance"
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next()
    }

    return await updateSession(request)
  }

  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
