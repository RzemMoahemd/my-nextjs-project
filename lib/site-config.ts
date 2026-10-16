// ======================================================
// SYSTEME DE PERSONNALISATION DE L'ACCUEIL (OBSOLETE)
// ======================================================
// ⚠️  CE FICHIER EST DÉPRÉCIÉ.
//
// Il concernait l'ancien système de personnalisation de l'accueil (table
// "homepage_config" + "homepage_component_types"), qui a été REMPLACÉ par le
// système suivant :
//
//   lib/settings.ts  +  /api/settings/general
//   → Table "settings" (clé/valeur)
//   → Page admin : Paramètres > Accueil
//
// NE PLUS UTILISER ces fonctions. Elles sont conservées uniquement pour
// compatibilité et seront retirées dans une prochaine version.
//
// À la place, utilisez :
//   import { getAllSettings, saveSetting } from "@/lib/settings"
//   import { loadSettings } from "@/lib/settings-server"
//
// Si vous avez besoin d'un "Page Builder" (glisser-déposer), créez une page
// admin dédiée et utilisez votre propre système.
//
// Mots-clés obsolètes : homepage_config, homepage_component_types,
//                       SiteCustomization, PageBuilder
// ======================================================

// Types pour les catégories principales (suggérées)
export interface CategoryType {
  id: number
  name: string
  slug: string
  description: string
  icon: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

// Types pour les sous-catégories personnalisables
export interface SiteCategory {
  id: number
  category_type_id: number | null
  category_type?: CategoryType
  name: string
  slug: string
  description: string
  image_url?: string
  color: string
  is_active: boolean
  display_order: number
  is_featured: boolean
  meta_title?: string
  meta_description?: string
  parent_id?: number
  created_at: string
  updated_at: string
}

// Structure de création/modification d'une sous-catégorie
export interface SiteCategoryInput {
  category_type_id: number
  name: string
  description?: string
  image_url?: string
  color?: string
  display_order?: number
  is_featured?: boolean
  meta_title?: string
  meta_description?: string
}

// Types pour les composants de page d'accueil
export interface HomepageComponentType {
  id: number
  name: string
  slug: string
  description: string
  component_name: string
  default_config: Record<string, any>
  is_active: boolean
  created_at: string
}

export interface HomepageComponent {
  id: number
  component_type_id: number
  component_type: HomepageComponentType
  display_order: number
  is_active: boolean
  configuration: Record<string, any>
  created_at: string
  updated_at: string
}

// Types pour la configuration visuelle
export interface VisualConfigItem {
  id: number
  config_key: string
  config_value: string
  config_type: 'color' | 'url' | 'text' | 'textarea' | 'select' | 'number'
  label: string
  description?: string
  validation_rules?: Record<string, any>
  is_required: boolean
  created_at: string
  updated_at: string
}

// Interface pour regrouper toute la configuration du site
export interface SiteConfiguration {
  categories: SiteCategory[]
  homepage_sections: HomepageComponent[]
  visual_config: Record<string, VisualConfigItem>
}

// =================================================
// CONSTANTES ET DONNÉES PAR DÉFAUT
// =================================================

// Couleurs pré-définies pour les catégories
export const CATEGORY_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#0EA5E9', // Sky
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#64748B', // Slate
  '#EC4899', // Pink
]

// NOTE: Les fonctions obsolètes ont été retirées.
// Elles étaient relatives au système "Site Builder" qui a été remplacé par
// le système Settings > Accueil. Consultez le commentaire en tête de ce
// fichier pour plus d'informations.
