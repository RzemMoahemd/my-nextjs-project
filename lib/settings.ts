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
  low_stock_threshold: number
}

export interface TaxConfig {
  rate: number
  prices_include_tax: boolean
  currency: string
}

export interface MaintenanceConfig {
  enabled: boolean
  message: string
}

export interface SeoConfig {
  title: string
  description: string
  keywords: string
}

export interface AppearanceConfig {
  primary_color: string
  secondary_color: string
  accent_color: string
  font_family: string
}

export interface AllSettings {
  store_info: StoreInfo
  shipping_msg: ShippingMsg
  stock: StockConfig
  tax: TaxConfig
  maintenance: MaintenanceConfig
  seo: SeoConfig
  appearance: AppearanceConfig
  delivery_fee: { amount: number }
  free_shipping: { threshold: number; enabled: boolean }
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
  stock: { low_stock_threshold: 5 },
  tax: { rate: 0, prices_include_tax: true, currency: "DT" },
  maintenance: {
    enabled: false,
    message: "Notre boutique est temporairement en maintenance. Revenez très bientôt !",
  },
  seo: {
    title: "ELEGANCE - Boutique de Vêtements",
    description: "Découvrez notre collection de vêtements de qualité, stylés et intemporels.",
    keywords: "vêtements, fashion, boutique en ligne, Instagram shopping",
  },
  appearance: {
    primary_color: "#171717",
    secondary_color: "#64748B",
    accent_color: "#F59E0B",
    font_family: "Geist",
  },
  delivery_fee: { amount: 7 },
  free_shipping: { threshold: 140, enabled: true },
}

// Clés modifiables via l'API (liste blanche)
export const WRITABLE_SETTING_KEYS: (keyof AllSettings)[] = [
  "store_info",
  "shipping_msg",
  "stock",
  "tax",
  "maintenance",
  "seo",
  "appearance",
  "delivery_fee",
  "free_shipping",
]

// =================================================
// HELPERS
// =================================================

// Lecture de tous les paramètres (fusionne BD + défauts)
export async function getAllSettings(adminClient: SupabaseClient): Promise<AllSettings> {
  const { data, error } = await adminClient.from("settings").select("key, value")
  if (error || !data) {
    console.error("[settings] getAllSettings error:", error)
    return { ...DEFAULT_SETTINGS }
  }

  const result: Record<string, any> = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  for (const row of data) {
    if (row.key && row.value && typeof row.value === "object") {
      result[row.key] = { ...(result[row.key] || {}), ...row.value }
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
