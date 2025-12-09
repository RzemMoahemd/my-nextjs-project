-- Migration pour ajouter les couleurs avec codes hexadécimaux aux produits existants
-- Ce script transforme les données actuelles pour utiliser la nouvelle structure ProductColor

-- Créer des couleurs d'exemple pour les produits existants
-- Le script suivant va créer des variantes de couleur pour les produits sans variantes

-- D'abord, regardons les produits existants et leurs couleurs
-- UPDATE products SET colors = '["Noir", "Blanc", "Bleu"]'::jsonb WHERE name = 'T-Shirt Premium Noir';
-- UPDATE products SET colors = '["Bleu", "Noir"]'::jsonb WHERE name = 'Jean Slim Bleu';
-- UPDATE products SET colors = '["Gris", "Noir", "Blanc"]'::jsonb WHERE name = 'Hoodie Gris';
-- UPDATE products SET colors = '["Blanc", "Bleu ciel"]'::jsonb WHERE name = 'Chemise Blanche';
-- UPDATE products SET colors = '["Beige", "Marron", "Noir"]'::jsonb WHERE name = 'Pantalon Chino Beige';

-- Maintenant on utilise la nouvelle structure ProductColor avec name et hex
-- UPDATE pour migrer les couleurs vers la nouvelle structure

-- T-Shirt Premium Noir - ajout de plusieurs couleurs avec hexa
UPDATE products SET colors = '[
  {"name": "Noir", "hex": "#000000"},
  {"name": "Blanc", "hex": "#FFFFFF"},
  {"name": "Bleu", "hex": "#2563EB"},
  {"name": "Rouge", "hex": "#DC2626"}
]'::jsonb WHERE name = 'T-Shirt Premium Noir';

-- Jean Slim Bleu - couleurs classiques pour jeans
UPDATE products SET colors = '[
  {"name": "Bleu clair", "hex": "#60A5FA"},
  {"name": "Bleu foncé", "hex": "#1E40AF"},
  {"name": "Noir", "hex": "#000000"},
  {"name": "Gris", "hex": "#6B7280"}
]'::jsonb WHERE name = 'Jean Slim Bleu';

-- Hoodie Gris - couleurs tendances
UPDATE products SET colors = '[
  {"name": "Gris", "hex": "#6B7280"},
  {"name": "Noir", "hex": "#000000"},
  {"name": "Blanc", "hex": "#FFFFFF"},
  {"name": "Bleu marine", "hex": "#1E3A8A"}
]'::jsonb WHERE name = 'Hoodie Gris';

-- Chemise Blanche - couleurs classiques
UPDATE products SET colors = '[
  {"name": "Blanc", "hex": "#FFFFFF"},
  {"name": "Bleu ciel", "hex": "#0EA5E9"},
  {"name": "Rose pâle", "hex": "#FBCFE8"},
  {"name": "Gris clair", "hex": "#F3F4F6"}
]'::jsonb WHERE name = 'Chemise Blanche';

-- Pantalon Chino Beige - couleurs chics
UPDATE products SET colors = '[
  {"name": "Beige", "hex": "#D4B08A"},
  {"name": "Marron", "hex": "#92400E"},
  {"name": "Noir", "hex": "#000000"},
  {"name": "Vert olive", "hex": "#4B5563"}
]'::jsonb WHERE name = 'Pantalon Chino Beige';

-- Veste Noire - couleurs élégantes
UPDATE products SET colors = '[
  {"name": "Noir", "hex": "#000000"},
  {"name": "Marron", "hex": "#92400E"},
  {"name": "Bleu marine", "hex": "#1E3A8A"},
  {"name": "Gris anthracite", "hex": "#374151"}
]'::jsonb WHERE name = 'Veste Noire';

-- Créer des variantes colorées multiples pour tous les produits
-- Chaque couleur aura des tailles spécifiques avec des quantités différentes

-- Supprimer les anciennes variantes si elles existent
DELETE FROM variants WHERE product_id IN (SELECT id FROM products);

-- Recréer les variantes avec les nouvelles couleurs
INSERT INTO variants (product_id, color, size, quantity)
SELECT
  p.id,
  color_obj->>'name',
  unnest(p.sizes),
  CASE
    WHEN color_obj->>'name' = 'Noir' THEN 15
    WHEN color_obj->>'name' = 'Blanc' THEN 12
    WHEN color_obj->>'name' = 'Bleu' THEN 10
    WHEN color_obj->>'name' = 'Rouge' THEN 8
    WHEN color_obj->>'name' = 'Gris' THEN 6
    WHEN color_obj->>'name' = 'Beige' THEN 3
    WHEN color_obj->>'name' = 'Marron' THEN 5
    WHEN color_obj->>'name' = 'Rose pâle' THEN 4
    WHEN color_obj->>'name' = 'Bleu ciel' THEN 7
    WHEN color_obj->>'name' = 'Bleu marine' THEN 9
    WHEN color_obj->>'name' = 'Bleu clair' THEN 11
    WHEN color_obj->>'name' = 'Bleu foncé' THEN 13
    WHEN color_obj->>'name' = 'Vert olive' THEN 2
    WHEN color_obj->>'name' = 'Gris clair' THEN 1
    WHEN color_obj->>'name' = 'Gris anthracite' THEN 3
    ELSE 0
  END
FROM products p
CROSS JOIN jsonb_array_elements(p.colors) AS color_obj
WHERE p.colors IS NOT NULL;

-- Définir is_active pour tous les produits sauf la veste qui était désactivée
UPDATE products SET is_active = true WHERE name != 'Veste Noire';
UPDATE products SET is_active = false WHERE name = 'Veste Noire';

-- Images d'exemple pour les swatches en action
UPDATE products SET images = ARRAY[
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=500&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=500&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=500&fit=crop&crop=center'
] WHERE name = 'T-Shirt Premium Noir';

UPDATE products SET images = ARRAY[
  'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=500&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=400&h=500&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=400&h=500&fit=crop&crop=center'
] WHERE name = 'Jean Slim Bleu';

UPDATE products SET images = ARRAY[
  'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=500&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=500&fit=crop&crop=center'
] WHERE name = 'Hoodie Gris';

UPDATE products SET images = ARRAY[
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=500&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop&crop=center'
] WHERE name = 'Chemise Blanche';

UPDATE products SET images = ARRAY[
  'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=500&fit=crop&crop=center'
] WHERE name like '%Pantalon%';

UPDATE products SET images = ARRAY[
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=500&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&h=500&fit=crop&crop=center'
] WHERE name = 'Veste Noire';

-- Ajouter quelques nouveaux produits avec des swatches variés pour mieux tester
INSERT INTO products (name, description, price, category, sizes, colors, images, is_active, sku) VALUES (
  'Robe dété Été Multicolore',
  'Robe légère parfaite pour les journées dété. Design fluide avec imprimés colorés. Tissu respirant et agréable à porter.',
  79.99,
  'Robes',
  ARRAY['XS', 'S', 'M', 'L', 'XL'],
  '[
    {"name": "Rose", "hex": "#EC4899"},
    {"name": "Bleu", "hex": "#2563EB"},
    {"name": "Jaune", "hex": "#EAB308"},
    {"name": "Turquoise", "hex": "#06B6D4"},
    {"name": "Corail", "hex": "#FF6B6B"}
  ]'::jsonb,
  ARRAY['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500&fit=crop&crop=center'],
  true,
  'ROBE-SUMMER-01'
),
(
  'Jupe cuir Marron',
  'Jupe en cuir véritable, coupe élégante et moderne. Idéale pour les tenues chics ou casual.',
  129.99,
  'Jupes',
  ARRAY['34', '36', '38', '40'],
  '[
    {"name": "Marron", "hex": "#92400E"},
    {"name": "Noir", "hex": "#000000"},
    {"name": "Bordeaux", "hex": "#7F1D1D"}
  ]'::jsonb,
  ARRAY['https://images.unsplash.com/photo-1583496661160-fb5886a6aaaa?w=400&h=500&fit=crop&crop=center'],
  true,
  'SKIRT-LEATHER-02'
),
(
  'Pull en laine Mérinos',
  'Pull chaud et confortable en laine mérinos. Parfait pour l''hiver, style intemporel et durable.',
  89.99,
  'Pulls',
  ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  '[
    {"name": "Rouge brique", "hex": "#B91C1C"},
    {"name": "Vert forêt", "hex": "#166534"},
    {"name": "Gris foncé", "hex": "#374151"},
    {"name": "Bleu nuit", "hex": "#1E3A8A"}
  ]'::jsonb,
  ARRAY['https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=500&fit=crop&crop=center'],
  true,
  'SWEATER-MERINO-03'
);

-- Créer des variantes pour les nouveaux produits
INSERT INTO variants (product_id, color, size, quantity)
SELECT
  p.id,
  color_obj->>'name',
  unnest(p.sizes),
  CASE
    WHEN random() < 0.3 THEN 0
    WHEN random() < 0.6 THEN floor(random() * 5) + 1
    ELSE floor(random() * 10) + 5
  END
FROM products p
CROSS JOIN jsonb_array_elements(p.colors) AS color_obj
WHERE p.sku IN ('ROBE-SUMMER-01', 'SKIRT-LEATHER-02', 'SWEATER-MERINO-03');

-- Réactiver tous les produits sauf ceux qui étaient explicitement désactivés
UPDATE products SET is_active = true WHERE name != 'Veste Noire';

-- Vérifier que les données sont correctement insérées
SELECT p.name, p.colors, COUNT(v.*) as total_variants
FROM products p
LEFT JOIN variants v ON p.id = v.product_id
WHERE p.colors IS NOT NULL
GROUP BY p.id, p.name, p.colors
ORDER BY p.name;
