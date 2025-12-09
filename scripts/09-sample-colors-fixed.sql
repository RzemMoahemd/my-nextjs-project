-- Migration pour ajouter les couleurs avec codes hexadécimaux aux produits existants
-- VERSION CORRIGÉE : Compatible avec text[] au lieu de jsonb

-- Créer des couleurs d'exemple pour les produits existants
-- Le script suivant va utiliser la structure text[] existante mais avec des références aux couleurs

-- D'abord, créons une table de référence pour les couleurs disponibles
CREATE TABLE IF NOT EXISTS available_colors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  hex VARCHAR(7) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer les couleurs prédéfinies
INSERT INTO available_colors (name, hex) VALUES
  ('Noir', '#000000'),
  ('Blanc', '#FFFFFF'),
  ('Rouge', '#DC2626'),
  ('Bleu', '#2563EB'),
  ('Vert', '#16A34A'),
  ('Jaune', '#EAB308'),
  ('Rose', '#EC4899'),
  ('Violet', '#8B5CF6'),
  ('Gris', '#6B7280'),
  ('Beige', '#D4B08A'),
  ('Marron', '#92400E'),
  ('Orange', '#EA580C'),
  ('Turquoise', '#06B6D4'),
  ('Bordeaux', '#7F1D1D'),
  ('Argent', '#E5E7EB'),
  ('Or', '#F59E0B'),
  ('Bleu clair', '#60A5FA'),
  ('Bleu marine', '#1E3A8A'),
  ('Bleu foncé', '#1E40AF'),
  ('Vert forêt', '#166534'),
  ('Vert olive', '#4B5563'),
  ('Rose pâle', '#FBCFE8'),
  ('Rouge brique', '#B91C1C'),
  ('Gris clair', '#F3F4F6'),
  ('Gris anthracite', '#374151'),
  ('Bleu ciel', '#0EA5E9'),
  ('Corail', '#FF6B6B'),
  ('Gris foncé', '#374151'),
  ('Bleu nuit', '#1E3A8A')
ON CONFLICT (name) DO NOTHING;

-- Maintenant, utiliser une approche différente : stocker les références dans un format compatible
-- On va utiliser une convention de nommage pour identifier les couleurs avec leurs hex

-- Nettoyer d'abord les produits existants
UPDATE products SET colors = ARRAY[]::text[] WHERE colors IS NOT NULL AND array_length(colors, 1) > 0;

-- Mettre à jour les produits avec les couleurs disponibles (en utilisant les noms)
UPDATE products SET colors = ARRAY['Noir', 'Blanc', 'Bleu', 'Rouge']
WHERE name = 'T-Shirt Premium Noir' AND colors IS NULL;

UPDATE products SET colors = ARRAY['Bleu clair', 'Bleu foncé', 'Noir', 'Gris']
WHERE name = 'Jean Slim Bleu' AND colors IS NULL;

UPDATE products SET colors = ARRAY['Gris', 'Noir', 'Blanc', 'Bleu marine']
WHERE name = 'Hoodie Gris' AND colors IS NULL;

UPDATE products SET colors = ARRAY['Blanc', 'Bleu ciel', 'Rose pâle', 'Gris clair']
WHERE name = 'Chemise Blanche' AND colors IS NULL;

UPDATE products SET colors = ARRAY['Beige', 'Marron', 'Noir', 'Vert olive']
WHERE name = 'Pantalon Chino Beige' AND colors IS NULL;

UPDATE products SET colors = ARRAY['Noir', 'Marron', 'Bleu marine', 'Gris anthracite']
WHERE name = 'Veste Noire' AND colors IS NULL;

-- Ajouter quelques nouveaux produits avec des couleurs de la palette disponible
INSERT INTO products (name, description, price, category, sizes, colors, images, is_active, sku) VALUES
(
  'Robe d'été multicolore',
  'Robe légère parfaite pour les journées d''été. Design fluide avec imprimés colorés. Tissu respirant et agréable à porter.',
  79.99,
  'Robes',
  ARRAY['XS', 'S', 'M', 'L', 'XL'],
  ARRAY['Rose', 'Bleu', 'Jaune', 'Turquoise', 'Corail'],
  ARRAY['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500&fit=crop&crop=center'],
  true,
  'ROBE-SUMMER-01'
),
(
  'Jupe en cuir véritable',
  'Jupe en cuir véritable, coupe élégante et moderne. Idéale pour les tenues chics ou casual.',
  129.99,
  'Jupes',
  ARRAY['34', '36', '38', '40'],
  ARRAY['Marron', 'Noir', 'Bordeaux'],
  ARRAY['https://images.unsplash.com/photo-1583496661160-fb5886a6aaaa?w=400&h=500&fit=crop&crop=center'],
  true,
  'SKIRT-LEATHER-02'
),
(
  'Pull en laine mérinos',
  'Pull chaud et confortable en laine mérinos. Parfait pour l''hiver, style intemporel et durable.',
  89.99,
  'Pulls',
  ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  ARRAY['Rouge brique', 'Vert forêt', 'Gris foncé', 'Bleu nuit'],
  ARRAY['https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=500&fit=crop&crop=center'],
  true,
  'SWEATER-MERINO-03'
);

-- Supprimer et recréer les variantes pour les nouveaux produits
DELETE FROM variants WHERE product_id IN (
  SELECT id FROM products WHERE sku IN ('ROBE-SUMMER-01', 'SKIRT-LEATHER-02', 'SWEATER-MERINO-03')
);

-- Créer des variantes pour tous les produits avec couleurs
INSERT INTO variants (product_id, color, size, quantity)
SELECT
  p.id,
  c.color_name,
  c.size_name,
  CASE
    WHEN c.color_name IN ('Noir', 'Blanc', 'Bleu', 'Rouge') THEN GREATEST(5, (RANDOM() * 15)::INT)
    WHEN c.color_name IN ('Gris', 'Beige', 'Marron') THEN GREATEST(3, (RANDOM() * 10)::INT)
    ELSE GREATEST(1, (RANDOM() * 8)::INT)
  END
FROM products p
CROSS JOIN LATERAL (
  SELECT unnest(p.colors) as color_name, unnest(p.sizes) as size_name
) c
WHERE array_length(p.colors, 1) > 0;

-- Réactiver tous les produits
UPDATE products SET is_active = true;

-- Vérifier que tout fonctionne
SELECT
  p.name,
  p.colors,
  COUNT(v.*) as total_variants,
  COUNT(DISTINCT v.color) as color_count,
  COUNT(DISTINCT v.size) as size_count
FROM products p
LEFT JOIN variants v ON p.id = v.product_id
WHERE array_length(p.colors, 1) > 0
GROUP BY p.id, p.name, p.colors
ORDER BY p.name;
