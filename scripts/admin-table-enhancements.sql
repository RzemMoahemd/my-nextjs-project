-- Ajouter des colonnes utiles au tableau admin des produits
-- Commandes SQL à exécuter manuellement dans Supabase SQL Editor

-- 1. Ajouter la colonne SKU (optionnelle mais utile pour les développeurs)
ALTER TABLE products ADD COLUMN sku TEXT;

-- 2. Ajouter des SKUs exemples pour les produits existants
-- Génère automatiquement des SKUs comme "PROD-1", "PROD-2", etc.
UPDATE products SET sku = 'PROD-' || id::text WHERE sku IS NULL;

-- 3. Optionnel - Créer une table de configuration pour le seuil de stock faible
-- (Utile si vous voulez pouvoir changer le seuil via interface admin plus tard)
CREATE TABLE IF NOT EXISTS stock_config (
  id SERIAL PRIMARY KEY,
  low_stock_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Insérer la valeur par défaut pour le seuil de stock faible
INSERT INTO stock_config (low_stock_threshold)
SELECT 5
WHERE NOT EXISTS (SELECT 1 FROM stock_config LIMIT 1);

-- 5. Vérifier les données des produits avec les nouvelles colonnes
-- (Commande de vérification - pas nécessaire à exécuter)
/*
SELECT
  p.id,
  p.name,
  p.sku,
  COALESCE(p.created_at, NOW()::timestamp) as created_at,
  -- Calcul du stock total
  COALESCE(SUM(pv.quantity), 0) as total_stock,
  -- Compte des variantes
  COUNT(pv.*) as variants_count,
  -- Compte des tailles
  COUNT(DISTINCT pv.size) as sizes_count,
  -- Compte des couleurs
  COUNT(DISTINCT pv.color) as colors_count
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
GROUP BY p.id, p.name, p.sku, p.created_at
ORDER BY p.name;
*/

-- 6. Exemples de SKUs personnalisés pour certains produits
-- (Modifiez selon vos besoins)
/*
UPDATE products SET sku = 'TEE-001' WHERE name LIKE '%T-shirt%';
UPDATE products SET sku = 'PAN-002' WHERE name LIKE '%Pantalon%';
UPDATE products SET sku = 'CHA-003' WHERE name LIKE '%Chaussettes%';
-- Etc...
*/

COMMIT;
