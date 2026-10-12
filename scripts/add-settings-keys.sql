-- ============================================================
-- AJOUT DES CLÉS DE PARAMÈTRES PAR DÉFAUT
-- À exécuter dans le SQL Editor de Supabase
-- Sans danger : ON CONFLICT DO NOTHING (ne remplace rien)
-- ============================================================

INSERT INTO settings (key, value) VALUES
  ('store_info', jsonb_build_object(
    'name', 'ELEGANCE',
    'description', 'Boutique de vêtements de qualité et intemporels',
    'email', 'contact@elegance.com',
    'whatsapp', '+216XXXXXXXX',
    'instagram', 'https://www.instagram.com/mohamed_rzem/',
    'facebook', '',
    'address', '',
    'logo_url', '',
    'favicon_url', ''
  )),
  ('shipping_msg', jsonb_build_object(
    'banner_enabled', true,
    'banner_text', 'Livraison gratuite à partir de',
    'delay', '2 à 4 jours ouvrés',
    'return_policy', 'Retours acceptés sous 7 jours'
  )),
  ('stock', jsonb_build_object(
    'low_stock_threshold', 5
  )),
  ('tax', jsonb_build_object(
    'rate', 0,
    'prices_include_tax', true,
    'currency', 'DT'
  )),
  ('maintenance', jsonb_build_object(
    'enabled', false,
    'message', 'Notre boutique est temporairement en maintenance. Revenez très bientôt !'
  )),
  ('seo', jsonb_build_object(
    'title', 'ELEGANCE - Boutique de Vêtements',
    'description', 'Découvrez notre collection de vêtements de qualité, stylés et intemporels.',
    'keywords', 'vêtements, fashion, boutique en ligne, Instagram shopping'
  )),
  ('appearance', jsonb_build_object(
    'primary_color', '#171717',
    'secondary_color', '#64748B',
    'accent_color', '#F59E0B',
    'font_family', 'Geist'
  )),
  ('delivery_fee', jsonb_build_object('amount', 7)),
  ('free_shipping', jsonb_build_object('threshold', 140, 'enabled', true))
ON CONFLICT (key) DO NOTHING;

-- Vérification
SELECT key FROM settings ORDER BY key;
