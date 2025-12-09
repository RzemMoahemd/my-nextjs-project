-- Migration SQL pour ajouter les champs de coupons aux commandes
-- Exécutez ces commandes dans l'éditeur SQL de Supabase

-- Ajouter les champs pour les coupons
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS coupon_code TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS free_shipping_from_coupon BOOLEAN DEFAULT FALSE;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS inventory_restored BOOLEAN DEFAULT FALSE;

-- Ajouter des champs d'adresse (si pas déjà présents)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS postal_code TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS city TEXT;

-- Créer des index pour les champs de recherche
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON orders(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Mise à jour des politiques RLS
-- (Ces commandes sont optionnelles, vérifiez vos politiques existantes)

-- Résumé de la migration
DO $$
DECLARE
  total_orders INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_orders FROM orders;

  RAISE NOTICE '=== Migration des champs de coupons terminée ===';
  RAISE NOTICE 'Total de commandes: %', total_orders;
  RAISE NOTICE 'Champs ajoutés:';
  RAISE NOTICE '  - coupon_code: code du coupon appliqué';
  RAISE NOTICE '  - coupon_discount: montant de la remise (€)';
  RAISE NOTICE '  - free_shipping_from_coupon: livraison gratuite via coupon';
  RAISE NOTICE '  - inventory_restored: flag pour restauration du stock';
  RAISE NOTICE '===================================================';
END $$;
