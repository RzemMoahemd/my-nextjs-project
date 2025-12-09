-- Script SQL pour créer des exemples de coupons de test
-- Exécutez ces commandes dans l'éditeur SQL de Supabase

-- Créer quelques coupons d'exemple pour les tests
INSERT INTO coupons (code, type, value, expiration_date, max_uses, current_uses, is_active, minimum_order, description)
VALUES
  ('WELCOME10', 'percentage', 10, (NOW() + INTERVAL '30 days')::timestamp, NULL, 0, true, 0, 'Bienvenue : -10% sur tout le site'),
  ('FREESHIP', 'free_shipping', NULL, (NOW() + INTERVAL '60 days')::timestamp, 100, 0, true, 50, 'Livraison gratuite dès 50€ d''achat'),
  ('FLASH20', 'fixed', 20, (NOW() + INTERVAL '7 days')::timestamp, 50, 0, true, 0, 'Offre flash : -20€ sur votre commande'),
  ('SUMMER15', 'percentage', 15, (NOW() + INTERVAL '90 days')::timestamp, NULL, 0, false, 100, 'Soldes d''été : 15% de réduction dès 100€')
ON CONFLICT (code) DO NOTHING;

-- Afficher les coupons créés
SELECT
  code,
  type,
  value,
  to_char(expiration_date, 'DD/MM/YYYY HH24:MI') as expiration,
  max_uses,
  current_uses,
  CASE WHEN is_active THEN 'Actif' ELSE 'Inactif' END as status,
  minimum_order,
  description
FROM coupons
ORDER BY created_at DESC
LIMIT 10;
