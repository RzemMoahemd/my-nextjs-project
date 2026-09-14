-- ============================================================
-- SCRIPT D'INSTALLATION COMPLET - Base de données ELEGANCE
-- À exécuter ENTIÈREMENT dans le SQL Editor de Supabase
-- Ce script supprime et recrée toutes les tables nécessaires
-- ATTENTION : cela efface les données existantes
-- ============================================================

-- ============================================================
-- ÉTAPE 0 : NETTOYAGE (suppression dans le bon ordre)
-- ============================================================
DROP TABLE IF EXISTS coupon_usage CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS cart_reservations CASCADE;
DROP TABLE IF EXISTS low_stock_notifications CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS categories_backup CASCADE;
DROP TABLE IF EXISTS products_backup CASCADE;
DROP TABLE IF EXISTS product_site_categories CASCADE;
DROP TABLE IF EXISTS site_categories CASCADE;
DROP TABLE IF EXISTS homepage_config CASCADE;
DROP TABLE IF EXISTS homepage_component_types CASCADE;
DROP TABLE IF EXISTS site_visual_config CASCADE;
DROP TABLE IF EXISTS category_types CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS stock_config CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ============================================================
-- ÉTAPE 1 : CATÉGORIES (hiérarchie à 3 niveaux)
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);

-- Catégories principales (niveau 1)
INSERT INTO categories (name, parent_id) VALUES
  ('T-Shirts', NULL),
  ('Pantalons', NULL),
  ('Hoodies', NULL),
  ('Vestes', NULL),
  ('Chemises', NULL),
  ('Accessoires', NULL);

-- Sous-catégories (niveau 2)
INSERT INTO categories (name, parent_id)
SELECT 'Baggy', id FROM categories WHERE name = 'Pantalons' AND parent_id IS NULL
UNION ALL SELECT 'Skinny', id FROM categories WHERE name = 'Pantalons' AND parent_id IS NULL
UNION ALL SELECT 'Joggers', id FROM categories WHERE name = 'Pantalons' AND parent_id IS NULL
UNION ALL SELECT 'Hoodies Street', id FROM categories WHERE name = 'Hoodies' AND parent_id IS NULL
UNION ALL SELECT 'Hoodies Sport', id FROM categories WHERE name = 'Hoodies' AND parent_id IS NULL
UNION ALL SELECT 'T-shirts Basiques', id FROM categories WHERE name = 'T-Shirts' AND parent_id IS NULL
UNION ALL SELECT 'T-shirts Graphiques', id FROM categories WHERE name = 'T-Shirts' AND parent_id IS NULL
UNION ALL SELECT 'Blazers', id FROM categories WHERE name = 'Vestes' AND parent_id IS NULL;

-- ============================================================
-- ÉTAPE 2 : PRODUITS
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  promotional_price NUMERIC(10, 2),
  category_id UUID REFERENCES categories(id),
  subcategory_id UUID REFERENCES categories(id),
  subsubcategory_id UUID REFERENCES categories(id),
  sizes TEXT[] DEFAULT ARRAY[]::TEXT[],
  colors TEXT[] DEFAULT ARRAY[]::TEXT[],
  variants JSONB DEFAULT '[]'::JSONB,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  inventory JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  in_stock BOOLEAN DEFAULT TRUE,
  sku TEXT,
  badge TEXT,
  low_stock_threshold INTEGER DEFAULT 5,
  category TEXT,
  subcategory TEXT[] DEFAULT ARRAY[]::TEXT[],
  subsubcategory TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX idx_products_subsubcategory_id ON products(subsubcategory_id);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_is_active ON products(is_active);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON products FOR SELECT USING (true);

-- ============================================================
-- ÉTAPE 3 : ADMIN_USERS
-- ============================================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS désactivé sur admin_users : la vérification admin se fait côté API Next.js
-- (une policy qui référence admin_users elle-même cause une récursion infinie)
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- ÉTAPE 4 : COMMANDES
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  items JSONB NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  inventory_restored BOOLEAN DEFAULT FALSE,
  notes TEXT,
  coupon_code TEXT,
  coupon_discount NUMERIC(10, 2) DEFAULT 0,
  free_shipping_from_coupon BOOLEAN DEFAULT FALSE,
  user_id UUID,
  previous_status TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  can_undo_cancel BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'order' CHECK (type IN ('order', 'exchange')),
  parent_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  exchange_items JSONB,
  exchange_returned_amount NUMERIC(10, 2) DEFAULT 0,
  exchange_new_amount NUMERIC(10, 2) DEFAULT 0,
  exchange_difference NUMERIC(10, 2) DEFAULT 0,
  exchange_delivery_fee NUMERIC(10, 2) DEFAULT 0,
  exchange_stock_restored BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE orders ADD CONSTRAINT orders_status_check
CHECK (status IN ('pending', 'confirmed', 'preparing', 'in_delivery', 'delivered', 'delivery_failed', 'cancelled', 'returned', 'confirmed_delivery'));

ALTER TABLE orders ADD CONSTRAINT orders_previous_status_check
CHECK (previous_status IS NULL OR previous_status IN ('pending', 'confirmed', 'preparing', 'in_delivery', 'delivered', 'delivery_failed', 'cancelled', 'returned', 'confirmed_delivery'));

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_type ON orders(type);
CREATE INDEX idx_orders_parent_order_id ON orders(parent_order_id) WHERE parent_order_id IS NOT NULL;

-- ============================================================
-- ÉTAPE 5 : RÉSERVATIONS DE PANIER
-- ============================================================
CREATE TABLE cart_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  color TEXT DEFAULT 'Standard',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cart_reservations_cart_id ON cart_reservations(cart_id);
CREATE INDEX idx_cart_reservations_product ON cart_reservations(product_id);
CREATE INDEX idx_cart_reservations_expires_at ON cart_reservations(expires_at);

-- ============================================================
-- ÉTAPE 6 : PARAMÈTRES
-- ============================================================
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('delivery_fee', jsonb_build_object('amount', 7)),
  ('free_shipping', jsonb_build_object('threshold', 140, 'enabled', true))
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ÉTAPE 7 : COUPONS
-- ============================================================
CREATE TABLE coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed', 'free_shipping')),
  value DECIMAL(10,2),
  expiration_date TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  applicable_products JSONB,
  applicable_categories JSONB,
  minimum_order DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;

CREATE TABLE coupon_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID,
  order_id UUID,
  session_id TEXT,
  discount_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fonction updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Coupons d'exemple
INSERT INTO coupons (code, type, value, expiration_date, max_uses, minimum_order, description) VALUES
  ('WELCOME10', 'percentage', 10, NOW() + INTERVAL '30 days', 100, 50, 'Réduction de 10% sur votre première commande'),
  ('FREESHIP', 'free_shipping', null, NOW() + INTERVAL '365 days', null, 75, 'Livraison gratuite'),
  ('SUMMER20', 'fixed', 20, NOW() + INTERVAL '90 days', 500, 100, '20€ de réduction');

-- ============================================================
-- ÉTAPE 8 : PROFILS UTILISATEURS
-- ============================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  preferences JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ÉTAPE 9 : FAVORIS
-- ============================================================
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, product_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- ÉTAPE 10 : NOTIFICATIONS DE STOCK FAIBLE
-- ============================================================
CREATE TABLE low_stock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT,
  size TEXT,
  current_stock INTEGER,
  threshold INTEGER,
  notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_resolved BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- ÉTAPE 11 : PRODUITS D'EXEMPLE
-- ============================================================
INSERT INTO products (name, description, price, promotional_price, sizes, colors, variants, images, is_active, in_stock, badge)
SELECT
  'T-Shirt Classic',
  'T-shirt premium en coton 100%, confortable et durable.',
  29.99, 19.99,
  ARRAY['XS','S','M','L','XL','XXL'],
  ARRAY['Noir','Blanc','Bleu','Gris'],
  '[{"color":"Noir","size":"S","quantity":10},{"color":"Noir","size":"M","quantity":15},{"color":"Noir","size":"L","quantity":12},{"color":"Noir","size":"XL","quantity":8},{"color":"Blanc","size":"S","quantity":10},{"color":"Blanc","size":"M","quantity":15},{"color":"Blanc","size":"L","quantity":10},{"color":"Blanc","size":"XL","quantity":7},{"color":"Bleu","size":"M","quantity":10},{"color":"Bleu","size":"L","quantity":10},{"color":"Gris","size":"M","quantity":8},{"color":"Gris","size":"L","quantity":8}]'::JSONB,
  ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
  true, true, 'new'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'T-Shirt Classic');

INSERT INTO products (name, description, price, sizes, colors, variants, images, is_active, in_stock)
SELECT
  'Hoodie Premium',
  'Hoodie en molleton épais, parfait pour les journées froides.',
  49.99,
  ARRAY['S','M','L','XL'],
  ARRAY['Gris','Noir'],
  '[{"color":"Gris","size":"M","quantity":12},{"color":"Gris","size":"L","quantity":10},{"color":"Noir","size":"M","quantity":10},{"color":"Noir","size":"L","quantity":8}]'::JSONB,
  ARRAY['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800'],
  true, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Hoodie Premium');

INSERT INTO products (name, description, price, sizes, colors, variants, images, is_active, in_stock)
SELECT
  'Jean Slim',
  'Jean slim confortable avec stretch.',
  59.99,
  ARRAY['32','34','36','38','40'],
  ARRAY['Bleu','Noir'],
  '[{"color":"Bleu","size":"32","quantity":6},{"color":"Bleu","size":"34","quantity":10},{"color":"Bleu","size":"36","quantity":8},{"color":"Noir","size":"34","quantity":5},{"color":"Noir","size":"36","quantity":6}]'::JSONB,
  ARRAY['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800'],
  true, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Jean Slim');

-- ============================================================
-- TERMINÉ !
-- Prochaines étapes :
-- 1. Créer le bucket Storage "products" (public)
-- 2. Créer un utilisateur admin dans Authentication > Users
-- 3. Exécuter : INSERT INTO admin_users (id, email) SELECT id, email FROM auth.users WHERE email = 'VOTRE_EMAIL';
-- ============================================================