-- =================================================
-- EXTENSION : SYSTÈME DE SOUS-SOUS-CATÉGORIES
-- =================================================
-- Système hiérarchique à 3 niveaux :
-- Niveau 1 : Homme, Femme, Enfants (catégories principales)
-- Niveau 2 : Hoodies, Jeans, etc. (sous-catégories existantes)
-- Niveau 3 : Baggy, Skinny, etc. (sous-sous-catégories - NOUVEAU)

-- =================================================
-- 1. VÉRIFICATION DE LA STRUCTURE ACTUELLE
-- =================================================

-- Vérifier la table categories actuelle
SELECT
  '=== STRUCTURE CATÉGORIES ACTUELLE ===' as info,
  id,
  name,
  parent_id,
  CASE
    WHEN parent_id IS NULL THEN 'NIVEAU 1 (principal)'
    ELSE 'NIVEAU 2 (sous-catégorie)'
  END as level,
  CASE
    WHEN parent_id IS NULL THEN 'Catégorie principale'
    ELSE (SELECT name FROM categories p WHERE p.id = c.parent_id)
  END as parent_name
FROM categories c
ORDER BY parent_id NULLS FIRST, name;

-- =================================================
-- 2. EXEMPLES DE SOUS-SOUS-CATÉGORIES
-- =================================================

-- Fonction utilitaire pour créer des sous-sous-catégories
DO $$
DECLARE
  hoodies_id INTEGER;
  jeans_id INTEGER;
  tshirts_id INTEGER;
  jackets_id INTEGER;
  category_exists BOOLEAN := false;
BEGIN

  -- Chercher les catégories niveau 2 existantes
  SELECT id INTO hoodies_id FROM categories WHERE name = 'Hoodies' LIMIT 1;
  SELECT id INTO jeans_id FROM categories WHERE name = 'Pantalons' LIMIT 1;
  SELECT id INTO tshirts_id FROM categories WHERE name = 'T-shirts' LIMIT 1;
  SELECT id INTO jackets_id FROM categories WHERE name = 'Vestes' LIMIT 1;

  -- Créer des sous-sous-catégories pour Hoodies
  IF hoodies_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM categories WHERE name = 'Hoodies Street' AND parent_id = hoodies_id) INTO category_exists;
    IF NOT category_exists THEN
      INSERT INTO categories (name, parent_id) VALUES ('Hoodies Street', hoodies_id);
    END IF;

    SELECT EXISTS(SELECT 1 FROM categories WHERE name = 'Hoodies Sport' AND parent_id = hoodies_id) INTO category_exists;
    IF NOT category_exists THEN
      INSERT INTO categories (name, parent_id) VALUES ('Hoodies Sport', hoodies_id);
    END IF;

    SELECT EXISTS(SELECT 1 FROM categories WHERE name = 'Hoodies Vintage' AND parent_id = hoodies_id) INTO category_exists;
    IF NOT category_exists THEN
      INSERT INTO categories (name, parent_id) VALUES ('Hoodies Vintage', hoodies_id);
    END IF;
  END IF;

  -- Créer des sous-sous-catégories pour Pantalons (le nom actuel semble être "Pantalons")
  IF jeans_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM categories WHERE name = 'Joggers' AND parent_id = jeans_id) INTO category_exists;
    IF NOT category_exists THEN
      INSERT INTO categories (name, parent_id) VALUES ('Joggers', jeans_id);
    END IF;

    SELECT EXISTS(SELECT 1 FROM categories WHERE name = 'Cargo Pants' AND parent_id = jeans_id) INTO category_exists;
    IF NOT category_exists THEN
      INSERT INTO categories (name, parent_id) VALUES ('Cargo Pants', jeans_id);
    END IF;

    SELECT EXISTS(SELECT 1 FROM categories WHERE name = 'Leggings' AND parent_id = jeans_id) INTO category_exists;
    IF NOT category_exists THEN
      INSERT INTO categories (name, parent_id) VALUES ('Leggings', jeans_id);
    END IF;
  END IF;

  -- Créer des sous-sous-catégories pour T-shirts
  IF tshirts_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM categories WHERE name = 'T-shirts Graphiques' AND parent_id = tshirts_id) INTO category_exists;
    IF NOT category_exists THEN
      INSERT INTO categories (name, parent_id) VALUES ('T-shirts Graphiques', tshirts_id);
    END IF;

    SELECT EXISTS(SELECT 1 FROM categories WHERE name = 'T-shirts Basiques' AND parent_id = tshirts_id) INTO category_exists;
    IF NOT category_exists THEN
      INSERT INTO categories (name, parent_id) VALUES ('T-shirts Basiques', tshirts_id);
    END IF;

    SELECT EXISTS(SELECT 1 FROM categories WHERE name = 'Polo Shirts' AND parent_id = tshirts_id) INTO category_exists;
    IF NOT category_exists THEN
      INSERT INTO categories (name, parent_id) VALUES ('Polo Shirts', tshirts_id);
    END IF;
  END IF;

  -- Créer des sous-sous-catégories pour Vestes
  IF jackets_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM categories WHERE name = 'Blazers' AND parent_id = jackets_id) INTO category_exists;
    IF NOT category_exists THEN
      INSERT INTO categories (name, parent_id) VALUES ('Blazers', jackets_id);
    END IF;

    SELECT EXISTS(SELECT 1 FROM categories WHERE name = 'Short Coats' AND parent_id = jackets_id) INTO category_exists;
    IF NOT category_exists THEN
      INSERT INTO categories (name, parent_id) VALUES ('Short Coats', jackets_id);
    END IF;
  END IF;

END $$;

-- =================================================
-- 3. AFFICHAGE DE LA NOUVELLE STRUCTURE À 3 NIVEAUX
-- =================================================

SELECT
  '=== NOUVELLE STRUCTURE À 3 NIVEAUX ===' as info,
  c.id,
  CASE
    WHEN c.parent_id IS NULL THEN '🏷️ NIVEAU 1'
    WHEN p.parent_id IS NULL THEN '📂 NIVEAU 2'
    ELSE '📄 NIVEAU 3'
  END as hierarchy_level,
  c.name,
  CASE
    WHEN c.parent_id IS NULL THEN c.name
    ELSE COALESCE(greatgrandparent.name || ' → ', '') ||
         COALESCE(grandparent.name || ' → ', '') ||
         COALESCE(p.name, '-')
  END as full_path,
  COALESCE(p.name, '-') as immediate_parent
FROM categories c
LEFT JOIN categories p ON c.parent_id = p.id
LEFT JOIN categories grandparent ON p.parent_id = grandparent.id
LEFT JOIN categories greatgrandparent ON grandparent.parent_id = greatgrandparent.id
ORDER BY
  c.parent_id NULLS FIRST,
  CASE
    WHEN c.parent_id IS NULL THEN 0
    WHEN p.parent_id IS NULL THEN 1
    ELSE 2
  END,
  c.name;

-- =================================================
-- 4. EXEMPLES D'USAGE POUR L'ADMIN
-- =================================================

-- Exemple 1: Créer une nouvelle sous-sous-catégorie pour une sous-catégorie existante
-- Remplacer HOODIES_ID par l'ID réel de la catégorie "Hoodies"
-- INSERT INTO categories (name, parent_id) VALUES ('Hoodies Oversize', (SELECT id FROM categories WHERE name = 'Hoodies'));

-- Exemple 2: Créer plusieurs niveaux pour une nouvelle structure
-- INSERT INTO categories (name, parent_id) VALUES
--   ('Homme', NULL),  -- Niveau 1
--   ('Chemises', (SELECT id FROM categories WHERE name = 'Homme')),  -- Niveau 2
--   ('Chemises Slim Fit', (SELECT id FROM categories WHERE name = 'Chemises')),  -- Niveau 3
--   ('Chemises Regular Fit', (SELECT id FROM categories WHERE name = 'Chemises'));  -- Niveau 3

-- =================================================
-- 5. STATISTIQUES DE LA NOUVELLE STRUCTURE
-- =================================================

SELECT
  '=== STATISTIQUES STRUCTURE ===' as info,
  COUNT(*) as total_categories,
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as niveau_1,
  COUNT(CASE WHEN parent_id IS NOT NULL AND (
    SELECT parent_id FROM categories p WHERE p.id = categories.parent_id
  ) IS NULL THEN 1 END) as niveau_2,
  COUNT(CASE WHEN parent_id IS NOT NULL AND (
    SELECT parent_id FROM categories p WHERE p.id = categories.parent_id
  ) IS NOT NULL AND (
    SELECT parent_id FROM categories gp WHERE gp.id = p.parent_id
  ) IS NULL THEN 1 END) as niveau_3
FROM categories;

COMMIT;

-- =================================================
-- 🎯 PROCHAINES ÉTAPES POUR L'INTERFACE ADMIN :
-- =================================================
--
-- Dans votre interface backoffice, ajouter :
--
-- 1. SELECTEUR DE PARENT :
--    - Nouvel input dropdown montrant les catégories niveau 1 + 2
--    - Montrer la hiérarchie (ex: "Vêtements Femme → Hoodies")
--
-- 2. LOGIC METIER :
--    - Cette structure supporte maintenant hiérarchie illimitée
--    - L'admin peut créer autant de niveaux qu'il veut
--
-- 3. VALIDATION :
--    - Empêcher creation de niveau 3 pour niveau 3 (si voulu)
--    - Validation des slugs uniques au même niveau
--
-- 4. AFFICHAGE FRONT :
--    - Votre navigation supporte déjà cette structure
--    - Les composants filtre peuvent afficher la hiérarchie complète
