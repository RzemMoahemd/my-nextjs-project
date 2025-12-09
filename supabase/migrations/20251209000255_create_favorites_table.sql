-- Système de favoris pour les utilisateurs
-- Permet aux clients connectés de sauvegarder leurs produits préférés

DO $$
BEGIN
  -- Table favorites
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'favorites'
  ) THEN
    CREATE TABLE favorites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

      -- Contrainte d'unicité : un utilisateur ne peut avoir qu'un favori par produit
      UNIQUE(user_id, product_id)
    );

    RAISE NOTICE 'Table favorites créée';
  ELSE
    RAISE NOTICE 'Table favorites existe déjà';
  END IF;
END $$;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- Politiques de sécurité RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs ne voient que leurs propres favoris
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

-- Politique : Les utilisateurs peuvent ajouter leurs propres favoris
CREATE POLICY "Users can insert own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique : Les utilisateurs peuvent supprimer leurs propres favoris
CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Commentaire sur la table
COMMENT ON TABLE favorites IS 'Table des produits favoris des utilisateurs';
COMMENT ON COLUMN favorites.user_id IS 'ID de l''utilisateur (référence vers auth.users)';
COMMENT ON COLUMN favorites.product_id IS 'ID du produit favori';

RAISE NOTICE 'Migration favoris terminée avec succès';
