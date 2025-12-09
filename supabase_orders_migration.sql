-- Migration SQL pour ajouter les champs d'adresse aux commandes
-- Exécutez ces commandes dans l'éditeur SQL de Supabase

-- 1. Ajouter la colonne address (obligatoire)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';

-- 2. Ajouter la colonne postal_code (optionnel)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- 3. Ajouter la colonne city (obligatoire)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';

-- 4. Supprimer les valeurs par défaut temporaires (après migration des données existantes)
-- ATTENTION: Exécutez ces commandes seulement après avoir mis à jour toutes les commandes existantes
-- avec des adresses valides, sinon les commandes existantes causeront des erreurs

-- Décommentez ces lignes après avoir vérifié que toutes les commandes ont des adresses:
-- ALTER TABLE orders ALTER COLUMN address DROP DEFAULT;
-- ALTER TABLE orders ALTER COLUMN city DROP DEFAULT;

-- 5. Créer des index pour améliorer les performances des recherches par ville
CREATE INDEX IF NOT EXISTS idx_orders_city ON orders(city);
CREATE INDEX IF NOT EXISTS idx_orders_postal_code ON orders(postal_code) WHERE postal_code IS NOT NULL;

-- 6. Afficher un résumé
DO $$
DECLARE
  total_orders INTEGER;
  orders_with_address INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_orders FROM orders;
  SELECT COUNT(*) INTO orders_with_address FROM orders WHERE address != '' AND city != '';
  
  RAISE NOTICE '=== Résumé de la migration des commandes ===';
  RAISE NOTICE 'Total de commandes: %', total_orders;
  RAISE NOTICE 'Commandes avec adresse: %', orders_with_address;
  RAISE NOTICE '==========================================';
END $$;

-- Migration terminée!
-- Note: Les anciennes commandes auront des champs address et city vides.
-- Vous pouvez les mettre à jour manuellement si nécessaire.