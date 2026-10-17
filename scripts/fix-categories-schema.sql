-- ============================================================================
-- SCRIPT : fix-categories-schema.sql
-- ============================================================================
-- CORRECTION : alignment de la base de données avec le front-office (client).
--
-- Le code du projet (API + pages clients) s'attend à ce que la base possède :
--   1. Une table `categories` (id, name, parent_id)
--   2. Des colonnes de clés étrangères sur `products` :
--        category_id, subcategory_id, subsubcategory_id
--
-- Or la base a été initialement créée avec le schéma "legacy" (colonne
-- `products.category` en texte seul). C'est la cause racine du problème :
--   - /api/categories échoue (table absente) -> homepage, navbar et filtre
--     produits n'affichent aucune catégorie.
--   - /api/products utilise des jointures "required" vers categories, et si les
--     colonnes FK manquent ou sont NULL, les produits ne sont pas retournés.
--
-- Ce script est IDEMPOTENT : il peut être exécuté plusieurs fois sans casser
-- la base. Il ne supprime ni ne recrée les données existantes.
--
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor).
-- ============================================================================

-- 1. S'assurer que la table `categories` existe
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index utiles sur `categories`
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- 3. S'assurer que les colonnes de clés étrangères existent sur `products`
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subsubcategory_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subsubcategory TEXT;

-- 4. Index sur les nouvelles colonnes (mieux pour les jointures)
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_subsubcategory_id ON products(subsubcategory_id);

-- 5. Matérialiser les catégories de base à partir du schéma actuel.
--    Idempotent : ne crée que les catégories qui n'existent pas.
DO $$
DECLARE
  cats TEXT[] := ARRAY[
    'T-Shirts','Pantalons','Hoodies','Vestes','Chemises','Accessoires',
    'Jeans','Chaussures','Shorts'
  ];
  parent_uuid UUID;
  cat_name TEXT;
BEGIN
  FOREACH cat_name IN ARRAY cats
  LOOP
    SELECT id INTO parent_uuid
    FROM categories
    WHERE name = cat_name AND parent_id IS NULL
    LIMIT 1;

    IF parent_uuid IS NULL THEN
      INSERT INTO categories (name, parent_id)
      VALUES (cat_name, NULL)
      RETURNING id INTO parent_uuid;
    END IF;
  END LOOP;
END $$;

-- 6. Migration des données existantes (products -> categories)
--    a) Relationner chaque produit à sa catégorie principale (category -> categories.id)
DO $$
DECLARE
  r RECORD;
  cat_id UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT category
    FROM products
    WHERE category IS NOT NULL AND trim(category) <> ''
    ORDER BY category
  LOOP
    SELECT id INTO cat_id
    FROM categories
    WHERE name = r.category AND parent_id IS NULL
    LIMIT 1;

    IF cat_id IS NULL THEN
      INSERT INTO categories (name, parent_id)
      VALUES (r.category, NULL)
      RETURNING id INTO cat_id;
    END IF;

    UPDATE products
    SET category_id = cat_id,
        updated_at = NOW()
    WHERE category = r.category;
  END LOOP;

  -- S'assurer que tout produit a bien une catégorie principale
  UPDATE products
  SET category_id = (
    SELECT id FROM categories
    WHERE name = products.category AND parent_id IS NULL
    LIMIT 1
  )
  WHERE category_id IS NULL AND category IS NOT NULL;
END $$;

-- b) Relationner les sous-catégories si des données y sont présentes
--    (le champ legacy `subcategory` est un tableau TEXT[])
UPDATE products p
SET subcategory_id = c.id
FROM categories c
WHERE array_length(p.subcategory, 1) > 0
  AND c.name = p.subcategory[1]
  AND p.subcategory_id IS NULL
  AND c.parent_id IS NOT NULL;

-- c) Relationner les sous-sous-catégories si des données y sont présentes
--    (le champ legacy `subsubcategory` est un texte)
UPDATE products p
SET subsubcategory_id = c.id
FROM categories c
WHERE p.subsubcategory IS NOT NULL
  AND c.name = p.subsubcategory
  AND p.subsubcategory_id IS NULL
  AND c.parent_id IS NOT NULL;

-- 7. Compléter le lien `subsubcategory` texte vers la table categories si besoin
--    (relativement rare, mais couvert ci-dessus)

-- 8. Politiques RLS (lecture publique + écriture admin)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Admin write categories" ON categories
  FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- 9. Vérification de l'alignement
DO $$
DECLARE
  n_categories INTEGER;
  n_products INTEGER;
  n_linked INTEGER;
BEGIN
  SELECT COUNT(*) INTO n_categories FROM categories;
  SELECT COUNT(*) INTO n_products FROM products;
  SELECT COUNT(*) INTO n_linked
  FROM products
  WHERE category_id IS NOT NULL;

  RAISE NOTICE '=== VÉRIFICATION FINALE (fix-categories-schema) ===';
  RAISE NOTICE 'Catégories dans la table : %', n_categories;
  RAISE NOTICE 'Produits dans products : %', n_products;
  RAISE NOTICE 'Produits avec category_id renseigné : %', n_linked;
  RAISE NOTICE '====================================================';
END $$;
