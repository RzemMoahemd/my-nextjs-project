-- Ajouter un champ pour stocker le statut précédent lors d'annulations
-- Permet de restaurer le bon statut lors d'un UNDO

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'previous_status'
  ) THEN
    -- Ajouter la colonne previous_status
    ALTER TABLE orders ADD COLUMN previous_status TEXT;

    RAISE NOTICE 'Colonne previous_status ajoutée à la table orders';
  ELSE
    RAISE NOTICE 'Colonne previous_status existe déjà dans la table orders';
  END IF;
END $$;

-- Ajouter une contrainte pour valider les valeurs de previous_status
ALTER TABLE orders ADD CONSTRAINT orders_previous_status_check
CHECK (previous_status IS NULL OR previous_status IN ('pending', 'confirmed', 'preparing', 'in_delivery', 'delivered', 'delivery_failed', 'cancelled', 'returned', 'confirmed_delivery'));

-- Créer un commentaire pour la colonne
COMMENT ON COLUMN orders.previous_status IS 'Statut précédent avant annulation - utilisé pour UNDO';

-- Vérifier que la colonne a été ajoutée
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'previous_status';

RAISE NOTICE 'Migration terminée: previous_status ajouté pour gérer les UNDO correctement';
