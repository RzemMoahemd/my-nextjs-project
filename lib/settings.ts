import type { SupabaseClient } from "@supabase/supabase-js"

// =================================================
// TYPES DES PARAMÈTRES
// =================================================

export interface StoreInfo {
  name: string
  description: string
  email: string
  whatsapp: string
  instagram: string
  facebook: string
  address: string
  logo_url: string
  favicon_url: string
}

export interface ShippingMsg {
  banner_enabled: boolean
  banner_text: string
  delay: string
  return_policy: string
}

export interface StockConfig {
  // Seuil des notifications admin (tableau de bord) — cascade produit > global
  low_stock_threshold: number
  // Seuil d'affichage du message client "Plus que X disponible" sur la fiche produit.
  // Le message se base sur la variante SÉLECTIONNÉE (couleur + taille), pas le stock total.
  low_stock_display_threshold: number
}

export interface TaxConfig {
  currency: string
}

export interface MaintenanceConfig {
  enabled: boolean
  message: string
}

export interface SeoConfig {
  title: string
  description: string
  // Image d'apercu lors du partage sur WhatsApp / Facebook / X (OpenGraph).
  // URL ou data-URL (upload admin). Vide = pas d'image d'apercu.
  og_image: string
}

export interface HomepageConfig {
  hero_title: string
  hero_subtitle: string
  hero_button_text: string
  hero_image_url: string
  collections_title: string
  collections_subtitle: string
  new_title: string
  new_subtitle: string
  new_button_text: string
  feature1_title: string
  feature1_text: string
  feature2_title: string
  feature2_text: string
  feature3_title: string
  feature3_text: string
  // Images personnalisées des catégories principales (clé = nom exact),
  // uploadées depuis Paramètres > Accueil. Vide = image par défaut en dur.
  category_images?: Record<string, string>
}

export interface AppearanceConfig {
  primary_color: string
  secondary_color: string
  banner_color: string
  accent_color: string
  success_color: string
  danger_color: string
  font_family: string
}

export interface AllSettings {
  store_info: StoreInfo
  shipping_msg: ShippingMsg
  stock: StockConfig
  tax: TaxConfig
  maintenance: MaintenanceConfig
  seo: SeoConfig
  homepage: HomepageConfig
  appearance: AppearanceConfig
  delivery_fee: { amount: number }
  free_shipping: { threshold: number; enabled: boolean }
  // Durée de réservation de panier (en minutes)
  // 0 = réservation désactivée (stock immédiat)
  reservation_duration_minutes: number
}

// =================================================
// VALEURS PAR DÉFAUT (fallback si absent en BD)
// =================================================

export const DEFAULT_SETTINGS: AllSettings = {
  store_info: {
    name: "ELEGANCE",
    description: "Boutique de vêtements de qualité et intemporels",
    email: "contact@elegance.com",
    whatsapp: "+216XXXXXXXX",
    instagram: "https://www.instagram.com/mohamed_rzem/",
    facebook: "",
    address: "",
    logo_url: "",
    favicon_url: "",
  },
  shipping_msg: {
    banner_enabled: true,
    banner_text: "Livraison gratuite à partir de",
    delay: "2 à 4 jours ouvrés",
    return_policy: "Retours acceptés sous 7 jours",
  },
  stock: { low_stock_threshold: 5, low_stock_display_threshold: 5 },
  tax: { currency: "DT" },
  maintenance: {
    enabled: false,
    message: "Notre boutique est temporairement en maintenance. Revenez très bientôt !",
  },
  seo: {
    title: "ELEGANCE - Boutique de Vêtements",
    description: "Découvrez notre collection de vêtements de qualité, stylés et intemporels.",
    og_image: "",
  },
  homepage: {
    hero_title: "Style Intemporel",
    hero_subtitle: "Découvrez notre collection de vêtements de qualité, conçus pour votre style",
    hero_button_text: "Explorer la collection",
    hero_image_url: "/luxury-fashion-clothing.jpg",
    collections_title: "Nos collections",
    collections_subtitle: "Explorez nos différentes catégories de vêtements",
    new_title: "Nouveautés",
    new_subtitle: "Découvrez les derniers articles de notre collection.",
    new_button_text: "Voir tous les produits",
    feature1_title: "Qualité Premium",
    feature1_text: "Vêtements sélectionnés pour leur qualité et leur durabilité.",
    feature2_title: "Livraison Rapide",
    feature2_text: "",
    feature3_title: "Service Client",
    feature3_text: "Support réactif pour répondre à vos questions.",
    category_images: {},
  },
  appearance: {
    primary_color: "#171717",
    secondary_color: "#2563EB",
    banner_color: "#262626",
    accent_color: "#F59E0B",
    success_color: "#16A34A",
    danger_color: "#DC2626",
    font_family: "Geist",
  },
  delivery_fee: { amount: 7 },
  free_shipping: { threshold: 140, enabled: true },
  // Durée de réservation par défaut (15 minutes)
  reservation_duration_minutes: 15,
}

// Clés modifiables via l'API (liste blanche)
export const WRITABLE_SETTING_KEYS: (keyof AllSettings)[] = [
  "store_info",
  "shipping_msg",
  "stock",
  "tax",
  "maintenance",
  "seo",
  "homepage",
  "appearance",
  "delivery_fee",
  "free_shipping",
  // Réservation de panier
  "reservation_duration_minutes",
]

// =================================================
// HELPERS
// =================================================

// Lecture de tous les paramètres (fusionne BD + défauts)
// Gère les valeurs scalaires (ex: reservation_duration_minutes = number)
// ET les valeurs objets (ex: store_info = {...} fusionné).
export async function getAllSettings(adminClient: SupabaseClient): Promise<AllSettings> {
  const { data, error } = await adminClient.from("settings").select("key, value")
  if (error || !data) {
    console.error("[settings] getAllSettings error:", error)
    return { ...DEFAULT_SETTINGS }
  }

  const result: Record<string, any> = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  for (const row of data) {
    if (!row.key || row.value === undefined || row.value === null) continue
    if (typeof row.value === "object" && !Array.isArray(row.value)) {
      result[row.key] = { ...(result[row.key] || {}), ...row.value }
    } else {
      // Valeur scalaire (number, string, boolean) : remplace le défaut
      result[row.key] = row.value
    }
  }
  return result as AllSettings
}

// Sauvegarde d'un paramètre (clé dans la liste blanche uniquement)
export async function saveSetting(
  adminClient: SupabaseClient,
  key: string,
  value: unknown,
): Promise<{ ok: boolean; error?: string }> {
  if (!WRITABLE_SETTING_KEYS.includes(key as keyof AllSettings)) {
    return { ok: false, error: `Setting key not allowed: ${key}` }
  }
  const { error } = await adminClient.from("settings").upsert({ key, value }, { onConflict: "key" })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
