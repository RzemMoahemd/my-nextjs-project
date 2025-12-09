-- Ajout de la colonne user_id à la table orders
-- Permet de lier les commandes aux utilisateurs connectés

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    -- Ajouter la colonne user_id
    ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    RAISE NOTICE 'Colonne user_id ajoutée à la table orders';
  ELSE
    RAISE NOTICE 'Colonne user_id existe déjà dans la table orders';
  END IF;
END $$;

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Créer une politique RLS pour que les utilisateurs voient leurs propres commandes
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN orders.user_id IS 'ID de l''utilisateur authentifié qui a passé cette commande';

RAISE NOTICE 'Migration terminée: user_id ajouté à la table orders avec index et politique RLS';
