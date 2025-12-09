-- Script pour créer des produits de test
-- Exécuter ce script dans l'admin de Supabase ou via pgAdmin/psql

-- Insérer des produits de test récents (created_at récent)
INSERT INTO products (name, description, price, promotional_price, category, sizes, colors, images, is_active, badge) VALUES
  ('Hoodie Cotton Premium', 'Hoodie confortable en coton bio', 89.99, 69.99, 'Hoodies', ARRAY['S', 'M', 'L', 'XL'], ARRAY['Noir', 'Gris', 'Blanc'], ARRAY['https://example.com/hoodie1.jpg'], true, 'new'),
  ('T-shirt Basique Blanc', 'T-shirt essentiel pour tous les jours', 29.99, NULL, 'T-shirts', ARRAY['XS', 'S', 'M', 'L'], ARRAY['Blanc', 'Noir'], ARRAY['https://example.com/tshirt1.jpg'], true, 'top_sale'),
  ('Jean Slim Fit Noir', 'Jean stretch confortable et moderne', 149.99, 119.99, 'Pantalons', ARRAY['28', '30', '32', '34', '36'], ARRAY['Noir', 'Bleu foncé'], ARRAY['https://example.com/jean1.jpg'], true, NULL)
ON CONFLICT (name) DO NOTHING;

-- Mettre à jour les dates de création pour les rendre récents (dans la dernière heure)
UPDATE products
SET created_at = NOW() - INTERVAL '1 hour' + (ROW_NUMBER() OVER (ORDER BY name)) * INTERVAL '10 minutes'
WHERE name IN ('Hoodie Cotton Premium', 'T-shirt Basique Blanc', 'Jean Slim Fit Noir');

-- Vérifier que les produits sont créés
SELECT id, name, category, price, promotional_price, badge, created_at
FROM products
WHERE name IN ('Hoodie Cotton Premium', 'T-shirt Basique Blanc', 'Jean Slim Fit Noir')
ORDER BY created_at DESC;
