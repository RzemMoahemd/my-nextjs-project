"use client"

import { createContext, useContext } from "react"
import type { AllSettings } from "@/lib/settings"

const SettingsContext = createContext<AllSettings | null>(null)

// Fourni par le layout (Server Component) : les parametres sont donc presents
// dans le HTML des le premier rendu — aucun fetch client, aucun clignotement.
export function SettingsProvider({
  settings,
  children,
}: {
  settings: AllSettings
  children: React.ReactNode
}) {
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
}

// Hook client pour lire les parametres de la boutique.
export function useSettings(): AllSettings {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error("useSettings doit etre utilise dans <SettingsProvider>")
  }
  return ctx
}

// Devise d'affichage des prix (parametre "Vente" de l'admin).
export function useCurrency(): string {
  const { tax } = useSettings()
  return tax?.currency?.trim() || "DT"
}
