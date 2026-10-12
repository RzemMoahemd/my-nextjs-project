import { cache } from "react"
import { createAdminClient } from "@/lib/supabase-admin"
import { getAllSettings } from "@/lib/settings"

// Chargeur serveur unique, mis en cache par requete (React cache) :
// le layout, les metadonnees et les pages serveur partagent LA meme lecture
// de la table settings (une seule requete SQL par chargement de page).
export const loadSettings = cache(async () => {
  return getAllSettings(createAdminClient())
})
