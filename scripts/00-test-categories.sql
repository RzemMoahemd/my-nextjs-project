-- Script pour créer des catégories de test
-- Exécuter ce script dans l'admin de Supabase ou via pgAdmin/psql

-- Insérer des catégories de test
INSERT INTO categories (name, parent_id) VALUES
  ('Hoodies', NULL),
  ('T-shirts', NULL),
  ('Pantalons', NULL),
  ('Chaussures', NULL),
  ('Accessoires', NULL),
  ('Vêtements Sport', NULL)
ON CONFLICT (name) DO NOTHING;

-- Vérifier que les catégories sont créées
SELECT id, name, parent_id FROM categories ORDER BY name;
