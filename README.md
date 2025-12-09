# ELEGANCE - Boutique de Vêtements en Ligne

Boutique de vêtements moderne, rapide et optimisée pour mobile, vendus via Instagram et WhatsApp.

## Technologies

- **Next.js 16** - Framework React moderne
- **Tailwind CSS v4** - Styling léger et responsive
- **Supabase** - Authentication, Database & Storage
- **TypeScript** - Typage fort
- **Vercel** - Déploiement

## Fonctionnalités

### Front-office Client
- ✅ Page d'accueil avec bannière hero
- ✅ Catalogue produits responsive
- ✅ Recherche et filtres (catégorie, taille, prix)
- ✅ Page détails produit avec galerie
- ✅ Bouton "Commander via WhatsApp" avec message auto-généré
- ✅ Produits similaires
- ✅ Page contact avec liens sociaux
- ✅ Design mobile-first et ultra optimisé

### Back-office Admin
- ✅ Authentification sécurisée Supabase
- ✅ Dashboard avec statistiques
- ✅ Gestion complète des produits (CRUD)
- ✅ Upload d'images dans Supabase Storage
- ✅ Gestion des catégories et tailles
- ✅ Statut stock (en stock / rupture)

## Installation

### 1. Cloner le projet
\`\`\`bash
git clone <repo-url>
cd elegance-store
\`\`\`

### 2. Installer les dépendances
\`\`\`bash
npm install
\`\`\`

### 3. Configurer Supabase

1. Créer un compte sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Copier les variables d'environnement
4. Exécuter le script de base de données:

\`\`\`bash
# Dans Supabase, aller à "SQL Editor" et exécuter le script:
scripts/01-init-database.sql
\`\`\`

5. Créer un bucket "products" dans Storage pour les images

### 4. Variables d'environnement

Copier \`.env.example\` à \`.env.local\`:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Remplir les variables avec vos clés Supabase.

### 5. Créer un utilisateur admin

Dans Supabase SQL Editor:
\`\`\`sql
-- Créer un utilisateur auth
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, instance_id, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  'admin@elegance.com',
  crypt('votre_motdepasse', gen_salt('bf')),
  NOW(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  '{}',
  '{}',
  NOW(),
  NOW()
);

-- Récupérer l'ID de l'utilisateur et l'ajouter à admin_users
-- SELECT id FROM auth.users WHERE email = 'admin@elegance.com';

INSERT INTO admin_users (id, email, role)
VALUES ('USER_ID_HERE', 'admin@elegance.com', 'admin');
\`\`\`

### 6. Lancer le serveur de développement
\`\`\`bash
npm run dev
\`\`\`

Ouvrir [http://localhost:3000](http://localhost:3000)

## URLs Importantes

- **Site public** : http://localhost:3000
- **Admin** : http://localhost:3000/admin
- **Admin Login** : http://localhost:3000/admin/login

## Structure du Projet

\`\`\`
.
├── app/
│   ├── page.tsx                    # Accueil
│   ├── products/                   # Pages produits
│   │   ├── page.tsx               # Catalogue
│   │   └── [id]/page.tsx          # Détails
│   ├── contact/
│   │   └── page.tsx               # Contact
│   ├── admin/                      # Zone admin
│   │   ├── login/page.tsx         # Login admin
│   │   ├── dashboard/page.tsx     # Dashboard
│   │   └── products/              # Gestion produits
│   ├── api/                        # API Routes
│   │   └── products/              # CRUD produits
│   └── layout.tsx
├── components/
│   ├── navbar.tsx
│   ├── footer.tsx
│   └── product-card.tsx
├── lib/
│   ├── supabase-client.ts
│   ├── supabase-server.ts
│   ├── supabase-admin.ts
│   ├── auth-utils.ts
│   └── types.ts
└── scripts/
    └── 01-init-database.sql
\`\`\`

## Configuration de Supabase Storage

1. Aller à "Storage" dans Supabase Dashboard
2. Créer un nouveau bucket "products"
3. Configurer les permissions RLS:

\`\`\`sql
-- Lecture publique des images
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

-- Écriture pour les admins
CREATE POLICY "Admin Upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'products' AND
    auth.uid() IN (SELECT id FROM admin_users)
  );
\`\`\`

## Configuration WhatsApp et Instagram

Mettre à jour les liens dans les composants:
- \`components/navbar.tsx\` - Lien Instagram
- \`components/footer.tsx\` - Liens sociaux
- \`app/contact/page.tsx\` - Lien WhatsApp et Instagram
- \`app/products/[id]/page.tsx\` - Lien WhatsApp de commande

## Déploiement sur Vercel

1. Pousser le code sur GitHub
2. Se connecter à [vercel.com](https://vercel.com)
3. Importer le repository
4. Ajouter les variables d'environnement Supabase
5. Déployer

\`\`\`bash
npm run build
npm run start
\`\`\`

## Optimisations Réalisées

- ✅ **Mobile-First** - Design responsive optimisé pour tous les appareils
- ✅ **Images Optimisées** - Utilisation de Next.js Image pour compression auto
- ✅ **Lazy Loading** - Chargement des images à la demande
- ✅ **Code Splitting** - Chargement du code optimisé
- ✅ **SEO** - Meta tags, Open Graph, JSON-LD
- ✅ **Performance** - Vercel + Turbopack pour build ultra rapide
- ✅ **RLS Supabase** - Sécurité des données avec Row Level Security
- ✅ **API Optimisée** - Requêtes minimales et cachées

## Support

Pour toute question ou problème, consulter la documentation:
- [Next.js Docs](https://nextjs.org)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)

---

Créé avec ❤️ pour votre boutique de vêtements
