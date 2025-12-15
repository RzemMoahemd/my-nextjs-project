-- =================================================
-- Système de personnalisation du site e-commerce
-- Gestion des catégories principales et sous-catégories
-- Sections de page d'accueil personnalisables
-- Configuration visuelle (couleurs, logo)
-- =================================================

-- =================================================
-- 1. GESTION DES CATÉGORIES PRINCIPALES (SUGGÉRÉES)
-- =================================================

-- Types de catégories suggérées (non modifiables par l'admin)
CREATE TABLE IF NOT EXISTS category_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'shopping-bag',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fonctions de catégories populaires pour boutiques Instagram
INSERT INTO category_types (name, slug, description, icon, display_order) VALUES
  ('Vêtements Femme', 'women-clothing', 'Robes, chemisiers, pantalons, jupes, vestes...', 'user-women', 1),
  ('Vêtements Homme', 'men-clothing', 'Chemises, pantalons, polos, vestes, costumes...', 'user', 2),
  ('Mode Enfant', 'kids-fashion', 'Vêtements pour bébés, enfants, adolescents...', 'child', 3),
  ('Chaussures & Accessoires', 'shoes-accessories', 'Chaussures, sacs à main, ceintures, bijoux...', 'footprints', 4),
  ('Sacs & Bagagerie', 'bags-luggage', 'Sacs à dos, valises, petits sacs, porte-monnaie...', 'bag', 5),
  ('Parfums & Cosmétiques', 'perfume-beauty', 'Parfums, maquillage, produits de soins...', 'flask', 6),
  ('Maison & Lifestyle', 'home-lifestyle', 'Décoration, linge de maison, objets déco...', 'home', 7),
  ('Sport & Fitness', 'sports-fitness', 'Vêtements de sport, équipements de fitness...', 'activity', 8),
  ('Technologie', 'technology', 'Accessoires tech, gadgets, objets connectés...', 'smartphone', 9),
  ('Livres & Art', 'books-art', 'Livres, art, musique, culture...', 'book-open', 10)
ON CONFLICT (slug) DO NOTHING;

-- =================================================
-- 2. GESTION DES SOUS-CATÉGORIES PERSONNALISABLES
-- =================================================

CREATE TABLE IF NOT EXISTS site_categories (
  id SERIAL PRIMARY KEY,
  category_type_id INTEGER REFERENCES category_types(id),
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  image_url VARCHAR(255),
  color VARCHAR(20) DEFAULT '#3B82F6', -- Couleur de la catégorie
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false, -- Catégorie mise en avant
  meta_title VARCHAR(255),
  meta_description TEXT,
  parent_id INTEGER REFERENCES site_categories(id), -- Support pour hiérarchie future
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Contrainte pour s'assurer qu'une sous-catégorie appartient à un type
  CONSTRAINT category_type_required CHECK (category_type_id IS NOT NULL)
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_site_categories_category_type ON site_categories(category_type_id);
CREATE INDEX IF NOT EXISTS idx_site_categories_active ON site_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_site_categories_featured ON site_categories(is_featured);
CREATE INDEX IF NOT EXISTS idx_site_categories_slug ON site_categories(slug);

-- Table pour lier les produits aux catégories du site
CREATE TABLE IF NOT EXISTS product_site_categories (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  site_category_id INTEGER REFERENCES site_categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Indicateur si c'est la catégorie principale du produit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(product_id, site_category_id) -- Un produit ne peut être associé qu'une fois à une catégorie
);

-- Indexes pour optimisation
CREATE INDEX IF NOT EXISTS idx_product_site_categories_product ON product_site_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_site_categories_category ON product_site_categories(site_category_id);
CREATE INDEX IF NOT EXISTS idx_product_site_categories_primary ON product_site_categories(is_primary);

-- =================================================
-- 3. PERSONNALISATION DE LA PAGE D'ACCUEIL
-- =================================================

-- Types de composants disponibles pour la page d'accueil
CREATE TABLE IF NOT EXISTS homepage_component_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  component_name VARCHAR(100), -- Nom du composant React
  default_config JSONB, -- Configuration par défaut en JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Composants standards pour la page d'accueil
INSERT INTO homepage_component_types (name, slug, component_name, description, default_config) VALUES
  ('Bannière Hero', 'hero-banner', 'HeroBanner', 'Grande bannière avec image et contenu principal', '{"title": "Bienvenue", "subtitle": "", "image": "", "button_text": "Voir Produits", "button_link": "/products"}'),
  ('Catégories Populaires', 'featured-categories', 'FeaturedCategories', 'Grille des catégories mises en avant', '{"title": "Explorer par catégorie", "show_count": 6, "layout": "grid"}'),
  ('Produits Nouveaux', 'new-arrivals', 'NewArrivals', 'Derniers produits ajoutés', '{"title": "Nouveautés", "show_count": 8, "hide_time_ago": false}'),
  ('Produits en Promotion', 'trending-products', 'TrendingProducts', 'Produits tendance/populaires', '{"title": "Tendances", "show_count": 12, "algorithm": "trending"}'),
  ('Témoignages Clients', 'testimonials', 'TestimonialsReviews', 'Avis et témoignages clients', '{"title": "Ils nous font confiance", "show_count": 3}'),
  ('Galerie Instagram', 'instagram-gallery', 'InstagramGallery', 'Récupération automatique depuis Instagram', '{"account": "", "show_count": 6, "auto_refresh": true}'),
  ('Galerie Images', 'image-gallery', 'ImageGallery', 'Galerie d''images personnalisée', '{"title": "Notre univers", "images": []}'),
  ('Block HTML Libre', 'html-block', 'HTMLBlock', 'Bloc de contenu personnalisé', '{"content": ""}')
ON CONFLICT (slug) DO NOTHING;

-- Configuration de la page d'accueil pour chaque site
CREATE TABLE IF NOT EXISTS homepage_config (
  id SERIAL PRIMARY KEY,
  component_type_id INTEGER REFERENCES homepage_component_types(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  configuration JSONB, -- Configuration spécifique du composant
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(component_type_id, display_order) -- Empêche les doublons d'ordre
);

-- =================================================
-- 4. PERSONNALISATION VISUELLE (COULEURS, LOGO)
-- =================================================

-- Configuration visuelle générale du site
CREATE TABLE IF NOT EXISTS site_visual_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL, -- 'logo', 'primary_color', 'secondary_color', etc.
  config_value TEXT, -- Valeur de configuration (chemin d'image, couleur hex, etc.)
  config_type VARCHAR(50) DEFAULT 'string', -- 'color', 'url', 'text', 'textarea', 'select', 'number', etc.
  label VARCHAR(150), -- Label pour l'interface d'administration
  description TEXT, -- Description pour aider l'admin
  validation_rules JSONB, -- Règles de validation (format, longueur, etc.)
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Configuration par défaut du site
INSERT INTO site_visual_config (config_key, config_value, config_type, label, description, is_required) VALUES
  ('site_name', 'Ma Boutique', 'text', 'Nom du site', 'Le nom de votre boutique tel qu''il apparaîtra dans les titres', true),
  ('site_description', 'Découvrez nos produits exclusifs', 'textarea', 'Description du site', 'Description courte de votre activité pour le SEO', false),
  ('primary_color', '#3B82F6', 'color', 'Couleur principale', 'Couleur principale de votre branding', true),
  ('secondary_color', '#64748B', 'color', 'Couleur secondaire', 'Couleur complémentaire pour les accents', true),
  ('accent_color', '#F59E0B', 'color', 'Couleur d''accent', 'Couleur pour les boutons et éléments importants', true),
  ('logo_main', '', 'url', 'Logo principal', 'Logo main (format PNG, JPG, SVG recommandé)', false),
  ('logo_dark', '', 'url', 'Logo sombre', 'Version du logo pour fond sombre si nécessaire', false),
  ('favicon', '', 'url', 'Favicon', 'Icône du site (PNG recommandé, 32x32px)', false),
  ('font_family', 'Inter', 'select', 'Police principale', 'Police majoritaire pour le texte', false)
ON CONFLICT (config_key) DO NOTHING;

-- =================================================
-- 5. GESTION DES PRODUITS PAR CATÉGORIE
-- =================================================

-- Ajouter la colonne category_type_id à la table products si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_type_id') THEN
    ALTER TABLE products ADD COLUMN category_type_id INTEGER REFERENCES category_types(id);
    CREATE INDEX idx_products_category_type ON products(category_type_id);
  END IF;
END $$;

-- =================================================
-- TRIGGERS ET FONCTIONS UTILITAIRES
-- =================================================

-- Fonction pour générer automatiquement le slug d'une catégorie
CREATE OR REPLACE FUNCTION generate_category_slug(category_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Conversion en slug de base
  base_slug := lower(regexp_replace(category_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  -- Vérification de l'unicité
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM site_categories WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::TEXT;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer automatiquement le slug lors de l'insertion
CREATE OR REPLACE FUNCTION set_category_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_category_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'site_categories_slug_trigger') THEN
    CREATE TRIGGER site_categories_slug_trigger
    BEFORE INSERT OR UPDATE ON site_categories
    FOR EACH ROW EXECUTE FUNCTION set_category_slug();
  END IF;
END $$;

-- =================================================
-- DONNÉES D'EXEMPLE POUR TESTS
-- =================================================

-- Ajout de quelques sous-catégories d'exemple
INSERT INTO site_categories (category_type_id, name, description, color, display_order, is_featured) VALUES
  (1, 'Robes & Jupes', 'Collection de robes élégantes et jupes tendance', '#E91E63', 1, true),
  (1, 'Chemisiers & Blouses', 'Chemisiers modernes et blouses classiques', '#FF9800', 2, false),
  (1, 'Vestes & Manteaux', 'Vestes élégantes et manteaux d''hiver', '#2196F3', 3, true),
  (2, 'Chemises Casual', 'Chemises décontractées pour tous les jours', '#4CAF50', 1, true),
  (2, 'Costumes & Complets', 'Ensembles professionnels élégants', '#9C27B0', 2, false)
ON CONFLICT (slug) DO NOTHING;

-- Configuration page d'accueil de base
INSERT INTO homepage_config (component_type_id, display_order, is_active, configuration) VALUES
  (1, 1, true, '{"title": "Découvrez notre collection", "subtitle": "Produits exclusifs et tendance", "image": "", "button_text": "Voir la collection", "button_link": "/products"}'),
  (2, 2, true, '{"title": "Explorer nos catégories", "show_count": 8, "layout": "grid"}'),
  (3, 3, true, '{"title": "Dernières arrivées", "show_count": 12, "hide_time_ago": false}'),
  (4, 4, true, '{"title": "Tendances du moment", "show_count": 16, "algorithm": "trending"}')
ON CONFLICT (component_type_id, display_order) DO NOTHING;

COMMIT;
