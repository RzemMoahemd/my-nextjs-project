-- Création de la table des coupons
CREATE TABLE IF NOT EXISTS coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed', 'free_shipping')),
    value DECIMAL(10,2) NULL, -- Pour les réductions % ou fixe (€)
    expiration_date TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER, -- Nombre maximum d'utilisations
    current_uses INTEGER DEFAULT 0, -- Nombre d'utilisations actuelles
    is_active BOOLEAN DEFAULT true,
    applicable_products JSONB, -- Liste des IDs de produits concernés (ou null pour tous)
    applicable_categories JSONB, -- Liste des catégories concernées (ou null pour toutes)
    minimum_order DECIMAL(10,2) DEFAULT 0, -- Montant minimum pour appliquer le coupon
    description TEXT, -- Description du coupon pour l'affichage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Créer le trigger seulement s'il n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_coupons_updated_at') THEN
        CREATE TRIGGER update_coupons_updated_at
            BEFORE UPDATE ON coupons
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Index pour améliorer les performances (crée seulement s'ils n'existent pas)
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_expiration ON coupons(expiration_date) WHERE expiration_date IS NOT NULL;

-- Politiques RLS (Row Level Security) pour Supabase
-- DÉSACTIVÉ - La sécurité est gérée côté API Next.js
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;

-- Politiques RLS supprimées - La sécurité est gérée côté API Next.js
-- Row Level Security est DÉSACTIVÉ pour éviter les problèmes d'authentification

-- Table pour tracer les utilisations des coupons
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID, -- Peut être null pour les utilisateurs non connectés
    order_id UUID, -- Référence à la commande (si créée)
    session_id TEXT, -- Pour tracker les sessions anonymes
    discount_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la table d'usage (crée seulement s'ils n'existent pas)
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_session_id ON coupon_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON coupon_usage(order_id);

-- Inserts d'exemple seulement s'ils n'existent pas déjà
INSERT INTO coupons (code, type, value, expiration_date, max_uses, applicable_products, applicable_categories, minimum_order, description)
SELECT 'WELCOME10', 'percentage', 10, NOW() + INTERVAL '30 days', 100, null, null, 50, 'Réduction de 10% sur votre première commande'
WHERE NOT EXISTS (SELECT 1 FROM coupons WHERE code = 'WELCOME10');

INSERT INTO coupons (code, type, value, expiration_date, max_uses, applicable_products, applicable_categories, minimum_order, description)
SELECT 'FREESHIP', 'free_shipping', null, NOW() + INTERVAL '365 days', null, null, null, 75, 'Livraison gratuite'
WHERE NOT EXISTS (SELECT 1 FROM coupons WHERE code = 'FREESHIP');

INSERT INTO coupons (code, type, value, expiration_date, max_uses, applicable_products, applicable_categories, minimum_order, description)
SELECT 'SUMMER20', 'fixed', 20, NOW() + INTERVAL '90 days', 500, null, null, 100, '20€ de réduction sur les commandes d''été'
WHERE NOT EXISTS (SELECT 1 FROM coupons WHERE code = 'SUMMER20');

INSERT INTO coupons (code, type, value, expiration_date, max_uses, applicable_products, applicable_categories, minimum_order, description)
SELECT 'Tshirts50', 'percentage', 50, NOW() + INTERVAL '7 days', 20, '["tshirt-product-id-1", "tshirt-product-id-2"]'::jsonb, '["tshirts"]'::jsonb, 0, '50% sur les t-shirts cette semaine'
WHERE NOT EXISTS (SELECT 1 FROM coupons WHERE code = 'Tshirts50');

-- Créer un rôle admin si nécessaire (adapté selon votre setup actuel)
-- Note: Cette partie doit être adaptée selon votre table users/admin existante
DO $$
BEGIN
    -- Vérifier si la colonne role existe, sinon l'ajouter
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- Créer un utilisateur admin de test (optionnel, à adapter)
-- INSERT INTO users (email, role) VALUES ('admin@yourdomain.com', 'admin') ON CONFLICT DO NOTHING;
