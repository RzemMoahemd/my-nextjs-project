-- BACKUP SCRIPT - Phase 1: Sauvegarde des données actuelles
-- À exécuter AVANT toute modification

-- 1. Sauvegarde des catégories actuelles
CREATE TABLE IF NOT EXISTS categories_backup AS
SELECT * FROM categories;

-- 2. Sauvegarde des produits actuels
CREATE TABLE IF NOT EXISTS products_backup AS
SELECT * FROM products;

-- 3. Vérification des données
SELECT 'Categories backup: ' || COUNT(*) FROM categories_backup;
SELECT 'Products backup: ' || COUNT(*) FROM products_backup;

-- 4. Vérification des relations actuelles
SELECT
    p.name as product_name,
    p.category,
    array_length(p.subcategory, 1) as subcategory_count,
    p.subcategory
FROM products p
WHERE p.category IS NOT NULL
LIMIT 10;
