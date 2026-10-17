-- ============================================================================
-- DIAGNOSTIC : pourquoi les catégories ne s'affichent pas côté client
-- ============================================================================
-- À exécuter dans l'éditeur SQL Supabase pour vérifier l'état réel de la base.
-- Le but : confirmer si la table `categories` est alimentée, si les colonnes
-- `category_id` / `subcategory_id` / `subsubcategory_id` existent sur `products`
-- et si elles sont remplies.
-- ============================================================================

-- 1. Structure de la table `categories`
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- 2. Données de la table `categories`
SELECT id, name, parent_id, created_at, updated_at
FROM categories
ORDER BY parent_id NULLS FIRST, name;

-- 3. Nombre de catégories par niveau (racine vs sous-catégorie)
SELECT
  COUNT(*) AS total,
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) AS categorie_principale,
  COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) AS sous_categorie
FROM categories;

-- 4. Structure de la table `products` (colonnes clés)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN (
    'category', 'category_id', 'subcategory', 'subcategory_id',
    'subsubcategory', 'subsubcategory_id', 'name', 'price'
  )
ORDER BY ordinal_position;

-- 5. Produits existants : colonnes remplies
SELECT
  COUNT(*) AS total_products,
  COUNT(category) AS avec_category_txt,
  COUNT(category_id) AS avec_category_id,
  COUNT(subcategory) AS avec_subcategory,
  COUNT(subcategory_id) AS avec_subcategory_id,
  COUNT(subsubcategory) AS avec_subsubcategory,
  COUNT(subsubcategory_id) AS avec_subsubcategory_id
FROM products;

-- 6. Vérifier si des produits ont category_id NULL (ils seraient cachés par la jointure "required")
SELECT
  COUNT(*) AS total,
  COUNT(CASE WHEN category_id IS NULL THEN 1 END) AS category_id_NULL,
  COUNT(CASE WHEN subcategory_id IS NULL THEN 1 END) AS subcategory_id_NULL,
  COUNT(CASE WHEN subsubcategory_id IS NULL THEN 1 END) AS subsubcategory_id_NULL
FROM products;

-- 7. Exemple de produits + leur catégorie legacy
SELECT
  id,
  name,
  category,
  category_id,
  subcategory,
  subsubcategory
FROM products
ORDER BY created_at DESC
LIMIT 10;

-- 8. Vérifier si la table `categories` a des données et leur distribution
SELECT
  COUNT(*) AS total,
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) AS racines,
  COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) AS sous_categories
FROM categories;
