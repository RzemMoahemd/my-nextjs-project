-- Migration SQL pour Supabase
-- Exécutez ces commandes dans l'ordre dans l'éditeur SQL de Supabase

-- 1. Créer le type pour les variantes de produits
CREATE TYPE product_variant AS (
  id TEXT,
  color TEXT,
  size TEXT,
  quantity INTEGER
);

-- 2. Ajouter la colonne variants à la table products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- 3. Ajouter la colonne is_active à la table products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. Supprimer l'ancienne colonne in_stock (optionnel, si vous voulez nettoyer)
-- ATTENTION: Décommentez seulement si vous êtes sûr de ne plus en avoir besoin
-- ALTER TABLE products DROP COLUMN IF EXISTS in_stock;

-- 5. Supprimer l'ancienne colonne inventory (optionnel, si vous voulez nettoyer)
-- ATTENTION: Décommentez seulement si vous êtes sûr de ne plus en avoir besoin
-- ALTER TABLE products DROP COLUMN IF EXISTS inventory;

-- 6. Mettre à jour les produits existants pour qu'ils soient actifs par défaut
UPDATE products 
SET is_active = true 
WHERE is_active IS NULL;

-- 7. Migrer les données existantes de inventory vers variants (si vous avez des données)
-- Cette requête crée des variantes pour chaque combinaison couleur-taille avec l'inventaire existant
UPDATE products
SET variants = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'color', color_elem,
      'size', size_elem,
      'quantity', COALESCE((inventory->>size_elem)::integer, 0)
    )
  )
  FROM unnest(COALESCE(colors, ARRAY[]::text[])) AS color_elem
  CROSS JOIN unnest(sizes) AS size_elem
)
WHERE inventory IS NOT NULL 
  AND jsonb_typeof(inventory) = 'object'
  AND array_length(sizes, 1) > 0;

-- 8. Pour les produits sans couleurs, créer des variantes avec une couleur par défaut
UPDATE products
SET variants = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'color', 'Standard',
      'size', size_elem,
      'quantity', COALESCE((inventory->>size_elem)::integer, 0)
    )
  )
  FROM unnest(sizes) AS size_elem
)
WHERE (colors IS NULL OR array_length(colors, 1) IS NULL OR array_length(colors, 1) = 0)
  AND inventory IS NOT NULL 
  AND jsonb_typeof(inventory) = 'object'
  AND array_length(sizes, 1) > 0
  AND (variants IS NULL OR variants = '[]'::jsonb);

-- 9. Ajouter une couleur par défaut pour les produits qui n'en ont pas
UPDATE products
SET colors = ARRAY['Standard']
WHERE (colors IS NULL OR array_length(colors, 1) IS NULL OR array_length(colors, 1) = 0);

-- 10. Créer un index sur is_active pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- 11. Créer un index sur variants pour les requêtes JSON
CREATE INDEX IF NOT EXISTS idx_products_variants ON products USING GIN (variants);

-- 12. Mettre à jour la colonne badge pour supprimer 'promo' des valeurs existantes
-- Le badge 'promo' sera maintenant géré automatiquement par l'application
UPDATE products 
SET badge = NULL 
WHERE badge = 'promo';

-- 13. Ajouter une contrainte pour s'assurer que badge ne peut être que 'new' ou 'top_sale'
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_badge_check;

ALTER TABLE products 
ADD CONSTRAINT products_badge_check 
CHECK (badge IS NULL OR badge IN ('new', 'top_sale'));

-- 14. Fonction pour calculer le stock total d'un produit (utile pour les requêtes)
CREATE OR REPLACE FUNCTION get_product_total_stock(product_variants JSONB)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM((variant->>'quantity')::integer), 0)
    FROM jsonb_array_elements(product_variants) AS variant
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 15. Vue pour faciliter les requêtes sur les produits avec leur stock total
CREATE OR REPLACE VIEW products_with_stock AS
SELECT 
  p.*,
  get_product_total_stock(p.variants) as total_stock,
  CASE 
    WHEN get_product_total_stock(p.variants) = 0 THEN true 
    ELSE false 
  END as show_promo_badge
FROM products p;

-- 16. Mettre à jour la table orders pour supporter les couleurs dans les items
-- Les commandes existantes continueront de fonctionner
-- Les nouvelles commandes incluront la couleur

-- Note: Aucune modification de schéma nécessaire car items est déjà JSONB
-- L'application ajoutera simplement le champ 'color' aux nouveaux items

-- 17. Créer une fonction pour vérifier la disponibilité d'une variante
CREATE OR REPLACE FUNCTION check_variant_availability(
  p_product_id UUID,
  p_color TEXT,
  p_size TEXT,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_available INTEGER;
BEGIN
  SELECT COALESCE((variant->>'quantity')::integer, 0)
  INTO v_available
  FROM products p,
       jsonb_array_elements(p.variants) AS variant
  WHERE p.id = p_product_id
    AND variant->>'color' = p_color
    AND variant->>'size' = p_size;
  
  RETURN v_available >= p_quantity;
END;
$$ LANGUAGE plpgsql;

-- 18. Afficher un résumé de la migration
DO $$
DECLARE
  total_products INTEGER;
  active_products INTEGER;
  products_with_variants INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;
  SELECT COUNT(*) INTO active_products FROM products WHERE is_active = true;
  SELECT COUNT(*) INTO products_with_variants FROM products WHERE variants IS NOT NULL AND jsonb_array_length(variants) > 0;
  
  RAISE NOTICE '=== Résumé de la migration ===';
  RAISE NOTICE 'Total de produits: %', total_products;
  RAISE NOTICE 'Produits actifs: %', active_products;
  RAISE NOTICE 'Produits avec variantes: %', products_with_variants;
  RAISE NOTICE '============================';
END $$;

-- Migration terminée avec succès!
-- Vérifiez que tout fonctionne correctement avant de supprimer les anciennes colonnes (in_stock, inventory)