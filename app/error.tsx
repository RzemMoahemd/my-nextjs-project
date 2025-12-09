"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset?: () => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.error("[v0] Error:", error)
  }, [error])

  const handleReset = () => {
    if (typeof reset === "function") {
      reset()
    } else {
      // Fallback: reload page if reset is not available
      window.location.href = "/"
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">Oops!</h1>
        <p className="text-neutral-600 mb-2">Une erreur s'est produite.</p>
        <p className="text-neutral-500 text-sm mb-8">{error?.message || "Veuillez réessayer."}</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800 transition"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="px-6 py-2 border-2 border-neutral-900 text-neutral-900 rounded-lg font-semibold hover:bg-neutral-50 transition"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
