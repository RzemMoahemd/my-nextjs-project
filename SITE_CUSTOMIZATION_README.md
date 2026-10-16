# 🛍️ Documentation - Système de Personnalisation du Site E-commerce (OBSOLÈTE)

> ⚠️  **Ce système est DÉPRÉCIÉ.** Il a été remplacé par le système
> **"Paramètres > Accueil"** (table `settings`). Ce document est conservé
> à titre de référence historique uniquement.

## 🎯 Vue d'ensemble

Ce document décrit le système complet de personnalisation permettant aux propriétaires de boutiques Instagram de gérer leur site e-commerce sans intervention du développeur.
# 🛍️ Documentation - Système de Personnalisation du Site E-commerce

## 🎯 Vue d'ensemble

Ce document décrit le système complet de personnalisation permettant aux propriétaires de boutiques Instagram de gérer leur site e-commerce sans intervention du développeur.

## 📋 Fonctionnalités principales

### 1. Gestion des Catégories 🏷️
- **Catégories principales** (suggérées) : vêtements, accessoires, beauté, maison, sport, etc.
- **Sous-catégories personnalisables** : créées par l'admin pour chaque catégorie principale
- **Gestion complète** : activation/désactivation, couleurs, images, SEO

### 2. Page d'accueil personnalisable 🏠
- **Sections modélisées** : bannière hero, produits populaires, témoignages, gallery Instagram
- **Configuration individuelle** : chaque section peut être activée/désactivée et configurée
- **Ordre personnalisable** : réorganisation par glisser-déposer

### 3. Configuration visuelle 🎨
- **Couleurs du thème** : primaire, secondaire, accent
- **Logos et favicon** : gestion des images de marque
- **Configuration générale** : nom du site, descriptions, métadonnées

## 🗂️ Architecture technique

### Base de données (Supabase)

#### 1. `category_types` - Types de catégories principaux
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(100) - Nom affiché
- slug: VARCHAR(100) UNIQUE - URL slug
- description: TEXT - Description
- icon: VARCHAR(50) - Icône (Lucide React)
- display_order: INTEGER - Ordre d'affichage
```

#### 2. `site_categories` - Sous-catégories personnalisables
```sql
- id: SERIAL PRIMARY KEY
- category_type_id: FOREIGN KEY → category_types
- name: VARCHAR(150) - Nom personnalisé
- slug: VARCHAR(150) UNIQUE - URL généré auto
- color: VARCHAR(20) - Couleur (#hex)
- is_featured: BOOLEAN - Mise en avant
- meta_title/description: VARCHAR/TEXT - SEO
```

#### 3. `homepage_component_types` - Types de composants d'accueil
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(100) - Nom du composant
- slug: VARCHAR(100) UNIQUE - Identifiant
- component_name: VARCHAR(100) - Nom React
- default_config: JSONB - Config par défaut
```

#### 4. `homepage_config` - Configuration des sections d'accueil
```sql
- id: SERIAL PRIMARY KEY
- component_type_id: FOREIGN KEY → homepage_component_types
- display_order: INTEGER - Ordre d'affichage
- configuration: JSONB - Config personnalisée
- is_active: BOOLEAN - Section activée
```

#### 5. `site_visual_config` - Configuration visuelle
```sql
- id: SERIAL PRIMARY KEY
- config_key: VARCHAR(100) UNIQUE - 'primary_color', 'logo', etc.
- config_value: TEXT - Valeur configurée
- label: VARCHAR(150) - Label affiché
- description: TEXT - Aide contextuelle
```

## 🚀 Installation & Configuration

### 1. Application du script SQL
```bash
# Depuis votre projet
psql -d votre_base -f scripts/11-site-customization.sql
```

### 2. Création des tables dans Supabase
1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier/coller le contenu de `scripts/11-site-customization.sql`
3. Exécuter le script

### 3. Migration des données existantes
```sql
-- Relier les produits existants aux nouvelles catégories
UPDATE products
SET category_type_id = (
  CASE
    WHEN lower(category) LIKE '%femme%' OR lower(category) LIKE '%robe%' THEN 1
    WHEN lower(category) LIKE '%homme%' OR lower(category) LIKE '%chemise%' THEN 2
    WHEN lower(category) LIKE '%enfant%' OR lower(category) LIKE '%kids%' THEN 3
    WHEN lower(category) LIKE '%accessoire%' OR lower(category) LIKE '%sac%' THEN 4
    WHEN lower(category) LIKE '%parfum%' OR lower(category) LIKE '%cosmétique%' THEN 6
    ELSE NULL
  END
) WHERE category_type_id IS NULL;
```

## 💻 Utilisation des APIs

### Gestion des catégories

```typescript
import {
  getSiteCategories,
  createSiteCategory,
  updateSiteCategory,
  deleteSiteCategory
} from '@/lib/site-config'

// Récupérer toutes les catégories actives
const categories = await getSiteCategories()

// Créer une nouvelle sous-catégorie
const newCategory = await createSiteCategory({
  category_type_id: 1, // Vêtements Femme
  name: "Robes d'été",
  description: "Collection estivale",
  color: "#FF6B6B"
})

// Modifier une catégorie
await updateSiteCategory(1, {
  name: "Robes été 2024",
  is_featured: true
})
```

### Configuration de la page d'accueil

```typescript
import {
  getHomepageSections,
  updateHomepageSection,
  addHomepageSection
} from '@/lib/site-config'

// Récupérer les sections actuelles
const sections = await getHomepageSections()

// Modifier la configuration d'une section
await updateHomepageSection(1, {
  is_active: false,
  configuration: {
    title: "Nouvelle collection",
    show_count: 8
  }
})

// Ajouter une nouvelle section
await addHomepageSection(2, 99) // Type ID, ordre
```

### Configuration visuelle

```typescript
import {
  getVisualConfig,
  updateVisualConfig
} from '@/lib/site-config'

// Récupérer toute la config
const config = await getVisualConfig()

// Modifier la couleur primaire
await updateVisualConfig('primary_color', '#8B5CF6')
```

## 🎨 Interface d'administration suggérée

### 1. Gestion des Catégories
- **Sélecteur de type principal** : liste déroulante des 10 types suggérés
- **Formulaire de sous-catégorie** : nom, description, image, couleur
- **Liste drag & drop** : réorganisation des catégories
- **Actions** : activer/désactiver, mettre en avant, modifier, supprimer

### 2. Personnalisation Homepage
- **Sélecteur de composants** : drag & drop des types de sections
- **Configuration individuelle** : modales pour chaque section
- **Prévisualisation** : aperçu en temps réel des changements

### 3. Configuration Visuelle
- **Sélecteurs de couleur** : palette avec validation
- **Upload d'images** : gestion automatique du stockage
- **Aperçu en temps réel** : changements appliqués immédiatement

## 🔧 Exemple d'implémentation React

### Composant de gestion des catégories

```tsx
import { useEffect, useState } from 'react'
import { SiteCategory, getSiteCategories, createSiteCategory } from '@/lib/site-config'

export function CategoriesManager() {
  const [categories, setCategories] = useState<SiteCategory[]>([])
  const [selectedType, setSelectedType] = useState<number>(1)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    const data = await getSiteCategories()
    setCategories(data)
  }

  const handleCreate = async (formData: any) => {
    await createSiteCategory({
      category_type_id: selectedType,
      ...formData
    })
    loadCategories()
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      {/* Sélection du type de catégorie */}
      <select
        value={selectedType}
        onChange={(e) => setSelectedType(Number(e.target.value))}
      >
        <option value={1}>Vêtements Femme</option>
        <option value={2}>Vêtements Homme</option>
        {/* autres types */}
      </select>

      {/* Liste des sous-catégories */}
      <div className="grid gap-4">
        {categories
          .filter(cat => cat.category_type_id === selectedType)
          .map(category => (
            <div key={category.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: category.color }}
                  />
                  <h3 className="font-medium">{category.name}</h3>
                  {category.is_featured && (
                    <span className="text-xs bg-yellow-100 px-2 py-1 rounded">
                      Mise en avant
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {/* toggle active */}}
                  className={`px-3 py-1 rounded text-sm ${
                    category.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {category.is_active ? 'Activé' : 'Désactivé'}
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
```

## 🔍 Points d'attention

### Sécurité
- **Validation côté serveur** : toutes les entrées sont validées
- **Permissions utilisateur** : seulement les admins peuvent configurer
- **Limites de stockage** : quotas d'upload d'images

### Performance
- **Cache intelligent** : configurations mises en cache côté client
- **Lazy loading** : images chargées à la demande
- **Optimisation** : requêtes groupées et dédupliquées

### Compatibilité
- **Navigateurs modernes** : support IE11 déprécié depuis Tailwind v4
- **Responsive design** : interfaces adaptatives à tous les écrans
- **Accessibilité** : contrastes et navigation clavier

## 📚 Extension future

### Idées d'améliorations
- **Templates prédéfinis** : configurations d'exemple par secteur
- **A/B testing** : test de différentes configurations
- **Analytics intégré** : tracking des performances
- **Multi-langues** : internationalisation complète
- **Backup/Restore** : sauvegardes des configurations

Ce système offre une base solide pour une personnalisation complète d'un site e-commerce sans code, permettant aux propriétaires de boutiques Instagram de maintenir pleinement le contrôle de leur vitrine numérique.
