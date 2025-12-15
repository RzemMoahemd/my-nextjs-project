-- 🚀 SOLUTION COMPLÈTE : RÉPARATION ET MIGRATION DES CATÉGORIES

-- Phase 1: Vérifications pré-migration
SELECT
    '=== ÉTAT ACTUEL ===' as section,
    COUNT(*) as total_products,
    COUNT(category_id) as products_with_category_id,
    COUNT(subcategory_id) as products_with_subcategory_id,
    COUNT(subsubcategory_id) as products_with_subsubcategory_id
FROM products;

-- Phase 2: Réparation - Migrer tous les produits restants
UPDATE products
SET category_id = categories.id
FROM categories
WHERE products.category = categories.name
  AND products.category_id IS NULL
  AND categories.parent_id IS NULL;

UPDATE products
SET subcategory_id = categories.id
FROM categories
WHERE products.subcategory[1] = categories.name
  AND products.subcategory_id IS NULL
  AND categories.parent_id IS NOT NULL;

UPDATE products
SET subsubcategory_id = categories.id
FROM categories
WHERE products.subsubcategory = categories.name
  AND products.subsubcategory_id IS NULL
  AND categories.parent_id IS NOT NULL;

-- Phase 3: Vérifications post-réparation
SELECT
    '=== APRÈS RÉPARATION ===' as section,
    COUNT(*) as total_products,
    COUNT(category_id) as products_with_category_id,
    COUNT(subcategory_id) as products_with_subcategory_id,
    COUNT(subsubcategory_id) as products_with_subsubcategory_id
FROM products;

-- Phase 4: Validation finale
SELECT
    p.name as product_name,
    COALESCE(c1.name, '❌ MANQUANT') as category,
    COALESCE(c2.name, 'N/A') as subcategory,
    COALESCE(c3.name, 'N/A') as subsubcategory,
    CASE
        WHEN p.category_id IS NOT NULL THEN '✅'
        ELSE '❌'
    END as migration_status
FROM products p
LEFT JOIN categories c1 ON p.category_id = c1.id
LEFT JOIN categories c2 ON p.subcategory_id = c2.id
LEFT JOIN categories c3 ON p.subsubcategory_id = c3.id
ORDER BY p.created_at DESC
LIMIT 20;

-- Phase 5: Diagnostic direct des données actuelles
SELECT
    '=== DIAGNOSTIC DIRECT ===' as section,
    p.name as produit,
    'IDs en base:' as ids_check,
    p.category_id,
    p.subcategory_id,
    p.subsubcategory_id,
    'Noms depuis jointures:' as names_check,
    COALESCE(c.name, 'NULL') as category_name,
    COALESCE(sc.name, 'NULL') as subcategory_name,
    COALESCE(ssc.name, 'NULL') as subsubcategory_name,
    'Strings stockées:' as strings_check,
    p.category as category_string,
    CASE WHEN array_length(p.subcategory, 1) > 0 THEN p.subcategory[1] ELSE 'NULL' END as subcategory_string,
    p.subsubcategory as subsubcategory_string
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN categories sc ON p.subcategory_id = sc.id
LEFT JOIN categories ssc ON p.subsubcategory_id = ssc.id
ORDER BY p.created_at DESC
LIMIT 5;

-- Phase 6: Nettoyage (optionnel - à faire après validation)
-- ATTENTION: Ne faire qu'après validation complète !
-- UPDATE products SET category = NULL, subcategory = NULL, subsubcategory = NULL
-- WHERE category_id IS NOT NULL;
