-- Migration pour ajouter la fonctionnalité d'échange de commandes
-- Permet aux admins de créer des commandes d'échange côté backoffice

DO $$
BEGIN
  -- Ajouter le champ type pour différencier les commandes normales des échanges
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'type'
  ) THEN
    ALTER TABLE orders ADD COLUMN type TEXT DEFAULT 'order' CHECK (type IN ('order', 'exchange'));
    RAISE NOTICE 'Colonne type ajoutée à la table orders';
  ELSE
    RAISE NOTICE 'Colonne type existe déjà dans la table orders';
  END IF;

  -- Ajouter le champ parent_order_id pour lier l'échange à la commande originale
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'parent_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN parent_order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
    RAISE NOTICE 'Colonne parent_order_id ajoutée à la table orders';
  ELSE
    RAISE NOTICE 'Colonne parent_order_id existe déjà dans la table orders';
  END IF;

  -- Ajouter le champ exchange_items pour stocker les produits échangés et nouveaux
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'exchange_items'
  ) THEN
    ALTER TABLE orders ADD COLUMN exchange_items JSONB;
    RAISE NOTICE 'Colonne exchange_items ajoutée à la table orders';
  ELSE
    RAISE NOTICE 'Colonne exchange_items existe déjà dans la table orders';
  END IF;

  -- Ajouter les champs de calcul pour l'échange
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'exchange_returned_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN exchange_returned_amount NUMERIC(10, 2) DEFAULT 0;
    RAISE NOTICE 'Colonne exchange_returned_amount ajoutée à la table orders';
  ELSE
    RAISE NOTICE 'Colonne exchange_returned_amount existe déjà dans la table orders';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'exchange_new_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN exchange_new_amount NUMERIC(10, 2) DEFAULT 0;
    RAISE NOTICE 'Colonne exchange_new_amount ajoutée à la table orders';
  ELSE
    RAISE NOTICE 'Colonne exchange_new_amount existe déjà dans la table orders';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'exchange_difference'
  ) THEN
    ALTER TABLE orders ADD COLUMN exchange_difference NUMERIC(10, 2) DEFAULT 0;
    RAISE NOTICE 'Colonne exchange_difference ajoutée à la table orders';
  ELSE
    RAISE NOTICE 'Colonne exchange_difference existe déjà dans la table orders';
  END IF;
END $$;

-- Créer un index pour les performances sur les échanges
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id ON orders(parent_order_id) WHERE parent_order_id IS NOT NULL;

-- Commentaires pour documenter les champs
COMMENT ON COLUMN orders.type IS 'Type de commande: order (normale) ou exchange (échange)';
COMMENT ON COLUMN orders.parent_order_id IS 'ID de la commande originale pour les échanges';
COMMENT ON COLUMN orders.exchange_items IS 'Structure JSONB contenant returned[] et new[] pour les échanges';
COMMENT ON COLUMN orders.exchange_returned_amount IS 'Montant total des produits retournés dans un échange';
COMMENT ON COLUMN orders.exchange_new_amount IS 'Montant total des nouveaux produits dans un échange';
COMMENT ON COLUMN orders.exchange_difference IS 'Différence de montant entre nouveaux et retournés produits';

-- Vérifier que toutes les colonnes ont été ajoutées
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders'
    AND column_name IN ('type', 'parent_order_id', 'exchange_items', 'exchange_returned_amount', 'exchange_new_amount', 'exchange_difference')
ORDER BY column_name;

RAISE NOTICE 'Migration d''échange terminée avec succès !';
