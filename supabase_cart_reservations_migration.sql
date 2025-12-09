-- Migration SQL pour ajouter la colonne color aux réservations de panier
-- Exécutez ces commandes dans l'éditeur SQL de Supabase

-- 1. Ajouter la colonne color à la table cart_reservations
ALTER TABLE cart_reservations 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'Standard';

-- 2. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_cart_reservations_color ON cart_reservations(color);

-- 3. Créer un index composite pour les recherches par produit + taille + couleur
CREATE INDEX IF NOT EXISTS idx_cart_reservations_product_size_color 
ON cart_reservations(product_id, size, color);

-- 4. Afficher un résumé
DO $$
DECLARE
  total_reservations INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_reservations FROM cart_reservations;
  
  RAISE NOTICE '=== Résumé de la migration des réservations ===';
  RAISE NOTICE 'Total de réservations: %', total_reservations;
  RAISE NOTICE '=============================================';
END $$;

-- Migration terminée!
-- Toutes les réservations existantes auront 'Standard' comme couleur par défaut.