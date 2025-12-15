-- PHASE 3: Migration des données existantes
-- Migration progressive : remplissage des nouvelles colonnes

-- 3A. Migration des catégories principales (simple)
UPDATE products
SET category_id = categories.id
FROM categories
WHERE products.category = categories.name
  AND products.category_id IS NULL;

-- Vérification de la migration catégories principales
SELECT
    'Produits avec category_id migré: ' || COUNT(*)
FROM products
WHERE category_id IS NOT NULL;

-- 3B. Migration des sous-catégories (complexe - stratégie à définir)
-- NOTE: Les sous-catégories sont actuellement dans un array.
-- Nous devons décider comment les migrer vers un seul ID.

-- Option 1: Prendre le premier élément de l'array comme subcategory_id
-- (À adapter selon vos besoins métier)

-- D'abord, identifier les produits avec sous-catégories
SELECT
    p.name,
    p.category,
    p.subcategory,
    array_length(p.subcategory, 1) as sub_count
FROM products p
WHERE p.subcategory IS NOT NULL
  AND array_length(p.subcategory, 1) > 0
LIMIT 10;

-- Option choisie: Premier élément de l'array comme subcategory_id
-- (Vous pouvez modifier cette logique selon vos besoins)

UPDATE products
SET subcategory_id = (
    SELECT c.id
    FROM categories c
    WHERE c.name = products.subcategory[1]  -- Premier élément
      AND c.parent_id IS NOT NULL  -- Assurer que c'est une sous-catégorie
)
WHERE products.subcategory IS NOT NULL
  AND array_length(products.subcategory, 1) > 0
  AND products.subcategory_id IS NULL;

-- Vérification de la migration sous-catégories
SELECT
    'Produits avec subcategory_id migré: ' || COUNT(*)
FROM products
WHERE subcategory_id IS NOT NULL;

-- 3C. Vérification finale de la migration
SELECT
    p.name,
    p.category,
    c1.name as category_name,
    p.subcategory,
    c2.name as subcategory_name,
    p.category_id,
    p.subcategory_id
FROM products p
LEFT JOIN categories c1 ON p.category_id = c1.id
LEFT JOIN categories c2 ON p.subcategory_id = c2.id
WHERE p.category_id IS NOT NULL
LIMIT 20;
