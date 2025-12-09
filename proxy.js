import { updateSession } from "@/lib/auth-utils"
import { NextResponse } from "next/server"

export async function proxy(request) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (request.nextUrl.pathname === "/admin/login") {
      return NextResponse.next()
    }

    return await updateSession(request)
  }

  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
