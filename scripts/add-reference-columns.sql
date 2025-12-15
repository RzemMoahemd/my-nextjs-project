-- PHASE 2: Ajout des colonnes de référence
-- Ces colonnes sont ajoutées en parallèle des anciennes pour migration progressive

-- Ajouter les nouvelles colonnes de référence
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES categories(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS subsubcategory_id UUID REFERENCES categories(id);

-- Ajouter temporairement les colonnes string pour compatibilité
ALTER TABLE products ADD COLUMN IF NOT EXISTS subsubcategory TEXT;

-- Créer les index pour les performances (non-blocking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_subsubcategory_id ON products(subsubcategory_id);

-- Vérification que les colonnes ont été ajoutées
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
    AND column_name IN ('category_id', 'subcategory_id', 'subsubcategory_id')
ORDER BY column_name;
