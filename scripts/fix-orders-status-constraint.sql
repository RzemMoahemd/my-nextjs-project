-- Script pour corriger la contrainte de statut des commandes
-- À exécuter dans l'éditeur SQL de Supabase

-- Supprimer l'ancienne contrainte de statut si elle existe
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Créer la nouvelle contrainte de statut avec tous les statuts autorisés
ALTER TABLE orders ADD CONSTRAINT orders_status_check
CHECK (status IN ('pending', 'confirmed', 'preparing', 'in_delivery', 'delivered', 'delivery_failed', 'cancelled', 'returned', 'confirmed_delivery'));

-- Vérifier que la contrainte a été créée
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'orders_status_check';

-- Afficher un résumé
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_status_check'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE '✅ Contrainte orders_status_check créée avec succès';
    RAISE NOTICE 'Statuts autorisés: pending, confirmed, preparing, in_delivery, delivered, delivery_failed, cancelled, returned, confirmed_delivery';
  ELSE
    RAISE NOTICE '❌ Échec de création de la contrainte orders_status_check';
  END IF;
END $$;
