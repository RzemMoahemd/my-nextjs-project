-- =================================================
-- CORRECTION : MISE À JOUR DU SYSTÈME DE SOUS-SOUS-CATÉGORIES
-- =================================================

-- Vérifier d'abord quelles catégories existent réellement
SELECT
  '=== CATÉGORIES EXISTANTES ===' as info,
  id,
  name,
  parent_id,
  CASE
    WHEN parent_id IS NULL THEN 'NIVEAU 1'
    ELSE 'NIVEAU 2'
  END as level
FROM categories
ORDER BY parent_id NULLS FIRST, name;

-- =================================================
-- 1. CRÉATION DES SOUS-SOUS-CATÉGORIES MANUELLEMENT
-- =================================================

-- Créer des sous-sous-catégories basées sur les catégories existantes

-- D'abord, ajoutons quelques exemples génériques qui marcheront toujours
INSERT INTO categories (name, parent_id)
SELECT 'Hoodies Street', id FROM categories WHERE name = 'Hoodies'
UNION ALL
SELECT 'Hoodies Sport', id FROM categories WHERE name = 'Hoodies'
UNION ALL
SELECT 'Hoodies Vintage', id FROM categories WHERE name = 'Hoodies'
UNION ALL
SELECT 'Joggers', id FROM categories WHERE name = 'Pantalons'
UNION ALL
SELECT 'Cargo Pants', id FROM categories WHERE name = 'Pantalons'
UNION ALL
SELECT 'T-shirts Graphiques', id FROM categories WHERE name = 'T-shirts'
UNION ALL
SELECT 'T-shirts Basiques', id FROM categories WHERE name = 'T-shirts'
ON CONFLICT DO NOTHING;

-- =================================================
-- 2. ALTERNATIVE : CRÉATION GÉRIQUE (si les noms sont différents)
-- =================================================

-- Créer des sous-sous-catégories pour TOUTES les catégories niveau 2 existantes
INSERT INTO categories (name, parent_id)
SELECT
  c.name || ' - Variante A',
  c.id
FROM categories c
WHERE c.parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories sc WHERE sc.parent_id = c.id
  )
UNION ALL
SELECT
  c.name || ' - Variante B',
  c.id
FROM categories c
WHERE c.parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories sc WHERE sc.parent_id = c.id
  )
LIMIT 4; -- Limitons pour éviter trop de catégories lors des tests

-- =================================================
-- 3. VÉRIFICATION DE LA NOUVELLE STRUCTURE
-- =================================================

-- Affichage complet avec hiérarchie
SELECT
  '=== NOUVELLE STRUCTURE HIÉRARCHIQUE ===' as info,
  c.id,
  CASE
    WHEN c.parent_id IS NULL THEN '🏷️ NIVEAU 1'
    WHEN p.parent_id IS NULL THEN '📂 NIVEAU 2'
    ELSE '📄 NIVEAU 3'
  END as hierarchy_level,
  c.name as category_name,
  COALESCE(p.name, 'Racine') as parent_category,
  CASE
    WHEN c.parent_id IS NULL THEN c.name
    ELSE COALESCE(gp.name || ' → ', '') || p.name || ' → ' || c.name
  END as full_path
FROM categories c
LEFT JOIN categories p ON c.parent_id = p.id
LEFT JOIN categories gp ON p.parent_id = gp.id
ORDER BY
  COALESCE(gp.id, p.id, c.id),
  CASE WHEN c.parent_id IS NULL THEN 0 WHEN p.parent_id IS NULL THEN 1 ELSE 2 END,
  c.name;

-- Statistiques finales
SELECT
  '=== STATISTIQUES FINALES ===' as info,
  COUNT(*) as total_categories,
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as niveau_1,
  COUNT(CASE WHEN parent_id IS NOT NULL AND (
    SELECT parent_id FROM categories p WHERE p.id = categories.parent_id
  ) IS NULL THEN 1 END) as niveau_2,
  COUNT(CASE WHEN parent_id IS NOT NULL AND (
    SELECT parent_id FROM categories p WHERE p.id = categories.parent_id
  ) IS NOT NULL THEN 1 END) as niveau_3,
  STRING_AGG(
    CASE WHEN parent_id IS NOT NULL AND (
      SELECT parent_id FROM categories p WHERE p.id = categories.parent_id
    ) IS NOT NULL THEN name ELSE NULL END,
    ', '
  ) as sous_sous_categories
FROM categories;

COMMIT;

-- =================================================
-- 🎯 COMMENT UTILISER DANS VOTRE INTERFACE ADMIN
-- =================================================
--
-- Dans votre formulaire de création de catégories, ajouter :
--
-- 1. UN SELECT QUI MONTRE TOUTES LES CATÉGORIES POSSIBLES :
--
-- SELECT
--   id,
--   CASE
--     WHEN parent_id IS NULL THEN name || ' (Principal)'
--     ELSE (SELECT name FROM categories p WHERE p.id = categories.parent_id) || ' → ' || name
--   END as display_name,
--   parent_id IS NULL as is_root_level
-- FROM categories
-- ORDER BY parent_id NULLS FIRST, name;
--
-- 2. LORS DE LA CRÉATION :
--
-- - Laissez l'admin choisir n'importe quelle catégorie existante comme parent
-- - Cette structure supporte hiérarchie infinie (niveau 4, 5, etc.)
-- - Validez juste que le nom n'existe pas deja au même niveau
--
-- 3. BONUS : FILTRE FACULTATIF
--
-- - Pouvez empêcher niveau 4+ si vous voulez limiter à 3 niveaux
-- - CHCK : MAX hiérarchie niveau (si souhaité)
