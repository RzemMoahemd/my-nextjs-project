import { createClient } from '@/lib/supabase-server'
import { createClientComponentClient } from '@/lib/supabase-client'

// =================================================
// TYPES POUR LA CONFIGURATION DU SITE E-COMMERCE
// =================================================

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
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#64748B', // Slate
]

// Types de catégories principaux (suggestions système)
export const DEFAULT_CATEGORY_TYPES: Omit<CategoryType, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Vêtements Femme',
    slug: 'women-clothing',
    description: 'Robes, chemisiers, pantalons, jupes, vestes...',
    icon: 'user-women',
    is_active: true,
    display_order: 1,
  },
  {
    name: 'Vêtements Homme',
    slug: 'men-clothing',
    description: 'Chemises, pantalons, polos, vestes, costumes...',
    icon: 'user',
    is_active: true,
    display_order: 2,
  },
  {
    name: 'Mode Enfant',
    slug: 'kids-fashion',
    description: 'Vêtements pour bébés, enfants, adolescents...',
    icon: 'child',
    is_active: true,
    display_order: 3,
  },
  {
    name: 'Chaussures & Accessoires',
    slug: 'shoes-accessories',
    description: 'Chaussures, sacs à main, ceintures, bijoux...',
    icon: 'footprints',
    is_active: true,
    display_order: 4,
  },
  {
    name: 'Sacs & Bagagerie',
    slug: 'bags-luggage',
    description: 'Sacs à dos, valises, petits sacs, porte-monnaie...',
    icon: 'bag',
    is_active: true,
    display_order: 5,
  },
  {
    name: 'Parfums & Cosmétiques',
    slug: 'perfume-beauty',
    description: 'Parfums, maquillage, produits de soins...',
    icon: 'flask',
    is_active: true,
    display_order: 6,
  },
  {
    name: 'Maison & Lifestyle',
    slug: 'home-lifestyle',
    description: 'Décoration, linge de maison, objets déco...',
    icon: 'home',
    is_active: true,
    display_order: 7,
  },
  {
    name: 'Sport & Fitness',
    slug: 'sports-fitness',
    description: 'Vêtements de sport, équipements de fitness...',
    icon: 'activity',
    is_active: true,
    display_order: 8,
  },
  {
    name: 'Technologie',
    slug: 'technology',
    description: 'Accessoires tech, gadgets, objets connectés...',
    icon: 'smartphone',
    is_active: true,
    display_order: 9,
  },
  {
    name: 'Livres & Art',
    slug: 'books-art',
    description: 'Livres, art, musique, culture...',
    icon: 'book-open',
    is_active: true,
    display_order: 10,
  },
]

// =================================================
// FONCTIONS UTILITAIRES
// =================================================

// Génération automatique d'un slug à partir du nom
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with dashes
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
}

// Validation des couleurs hexadécimales
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

// Validation des URLs simples
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// =================================================
// FONCTIONS API POUR LA CONFIGURATION
// =================================================

// Récupération des catégories personnalisables
export async function getSiteCategories(): Promise<SiteCategory[]> {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase
    .from('site_categories')
    .select(`
      *,
      category_type:category_type_id (
        id,
        name,
        slug,
        icon
      )
    `)
    .eq('is_active', true)
    .order('display_order')

  if (error) throw error
  return data || []
}

// Création d'une nouvelle sous-catégorie
export async function createSiteCategory(category: SiteCategoryInput): Promise<SiteCategory> {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase
    .from('site_categories')
    .insert({
      ...category,
      slug: category.name ? generateSlug(category.name) : undefined,
    })
    .select(`
      *,
      category_type:category_type_id (
        id,
        name,
        slug,
        icon
      )
    `)
    .single()

  if (error) throw error
  return data
}

// Mise à jour d'une sous-catégorie
export async function updateSiteCategory(
  id: number,
  updates: Partial<SiteCategoryInput>
): Promise<SiteCategory> {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase
    .from('site_categories')
    .update({
      ...updates,
      slug: updates.name ? generateSlug(updates.name) : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      category_type:category_type_id (
        id,
        name,
        slug,
        icon
      )
    `)
    .single()

  if (error) throw error
  return data
}

// Suppression d'une catégorie
export async function deleteSiteCategory(id: number): Promise<void> {
  const supabase = createClientComponentClient()
  const { error } = await supabase
    .from('site_categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Réorganisation des catégories
export async function reorderCategories(orders: { id: number; display_order: number }[]): Promise<void> {
  const supabase = createClientComponentClient()

  const updates = orders.map(({ id, display_order }) => ({
    id,
    display_order,
    updated_at: new Date().toISOString(),
  }))

  for (const update of updates) {
    const { error } = await supabase
      .from('site_categories')
      .update(update)
      .eq('id', update.id)

    if (error) throw error
  }
}

// =================================================
// CONFIGURATION DE LA PAGE D'ACCUEIL
// =================================================

// Récupération des sections de la page d'accueil
export async function getHomepageSections(): Promise<HomepageComponent[]> {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase
    .from('homepage_config')
    .select(`
      *,
      component_type:component_type_id (
        id,
        name,
        slug,
        description,
        component_name,
        default_config
      )
    `)
    .eq('is_active', true)
    .order('display_order')

  if (error) throw error
  return data || []
}

// Mise à jour de la configuration d'accueil
export async function updateHomepageSection(
  id: number,
  updates: Partial<{ display_order: number; is_active: boolean; configuration: any }>
): Promise<HomepageComponent> {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase
    .from('homepage_config')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      component_type:component_type_id (
        id,
        name,
        slug,
        description,
        component_name,
        default_config
      )
    `)
    .single()

  if (error) throw error
  return data
}

// Ajout d'une nouvelle section d'accueil
export async function addHomepageSection(componentTypeId: number, order: number): Promise<HomepageComponent> {
  const supabase = createClientComponentClient()

  // Récupérer la configuration par défaut
  const { data: componentType } = await supabase
    .from('homepage_component_types')
    .select('*')
    .eq('id', componentTypeId)
    .single()

  const { data, error } = await supabase
    .from('homepage_config')
    .insert({
      component_type_id: componentTypeId,
      display_order: order,
      configuration: componentType?.default_config || {},
    })
    .select(`
      *,
      component_type:component_type_id (
        id,
        name,
        slug,
        description,
        component_name,
        default_config
      )
    `)
    .single()

  if (error) throw error
  return data
}

// =================================================
// CONFIGURATION VISUELLE
// =================================================

// Récupération de toute la configuration visuelle
export async function getVisualConfig(): Promise<Record<string, VisualConfigItem>> {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase
    .from('site_visual_config')
    .select('*')

  if (error) throw error

  const config: Record<string, VisualConfigItem> = {}
  data?.forEach((item) => {
    config[item.config_key] = item
  })

  return config
}

// Mise à jour d'une valeur de configuration visuelle
export async function updateVisualConfig(key: string, value: string): Promise<VisualConfigItem> {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase
    .from('site_visual_config')
    .update({
      config_value: value,
      updated_at: new Date().toISOString(),
    })
    .eq('config_key', key)
    .select('*')
    .single()

  if (error) throw error
  return data
}

// Récupération de toute la configuration du site
export async function getSiteConfiguration(): Promise<SiteConfiguration> {
  const [categories, homepage_sections, visual_config] = await Promise.all([
    getSiteCategories(),
    getHomepageSections(),
    getVisualConfig(),
  ])

  return {
    categories,
    homepage_sections,
    visual_config,
  }
}

// Sauvegarde de la configuration complète du site
export async function saveSiteConfiguration(config: Partial<SiteConfiguration>): Promise<void> {
  // Mise à jour des catégories actives si fourni
  if (config.categories) {
    for (const category of config.categories) {
      const updates: Partial<SiteCategoryInput> & { is_active?: boolean } = {
        is_active: category.is_active
      }
      await updateSiteCategory(category.id, updates)
    }
  }

  // Mise à jour des sections d'accueil si fourni
  if (config.homepage_sections) {
    for (const section of config.homepage_sections) {
      await updateHomepageSection(section.id, {
        is_active: section.is_active,
        configuration: section.configuration
      })
    }
  }

  // Mise à jour de la configuration visuelle si fourni
  if (config.visual_config) {
    for (const [key, value] of Object.entries(config.visual_config)) {
      await updateVisualConfig(key, value.config_value)
    }
  }
}
