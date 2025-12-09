# Structure du projet ELEGANCE

## Organisation des fichiers

\`\`\`
/app
  /admin
    /login/page.tsx              # Page de connexion admin
    /dashboard/page.tsx          # Dashboard admin avec statistiques
    /products
      /new/page.tsx              # Ajouter un produit
      /[id]/edit/page.tsx        # Modifier un produit
    /page.tsx                    # Redirection vers /admin/login
  /api
    /products
      /route.ts                  # GET tous les produits (public)
      /[id]/route.ts             # GET un produit spécifique
      /[id]/edit/route.ts        # PUT pour modifier (admin)
      /[id]/delete/route.ts      # DELETE pour supprimer (admin)
      /search/route.ts           # GET recherche produits
      /category/route.ts         # GET par catégorie
    /admin
      /stats/route.ts            # GET statistiques admin
  /contact/page.tsx              # Page contact avec WhatsApp/Instagram
  /products/page.tsx             # Catalogue produits (public)
  /products/[id]/page.tsx        # Détails d'un produit
  /products/loading.tsx          # Skeleton de chargement
  /page.tsx                      # Page d'accueil
  /layout.tsx                    # Layout principal
  /error.tsx                     # Gestion des erreurs
  /not-found.tsx                 # Page 404
  /globals.css                   # Styles globaux Tailwind

/components
  /navbar.tsx                    # Barre de navigation
  /footer.tsx                    # Pied de page
  /product-card.tsx              # Carte produit
  /admin-products-table.tsx      # Tableau de produits pour admin
  /ui/*                          # Composants shadcn/ui (pré-installés)

/lib
  /supabase-server.ts            # Client Supabase côté serveur
  /supabase-client.ts            # Client Supabase côté client
  /supabase-admin.ts             # Client admin Supabase
  /auth-utils.ts                 # Fonctions d'authentification
  /types.ts                      # Types TypeScript

/scripts
  /01-init-database.sql          # Création des tables et RLS
  /02-setup-admin.sql            # Guide pour créer un admin
  /03-sample-products.sql        # Données de test

/public
  /images/*                      # Images statiques

.env.example                     # Variables d'environnement (exemple)
.env.local.example               # Variables locales (exemple)
middleware.ts                    # Middleware Next.js pour auth
next.config.mjs                  # Configuration Next.js
tsconfig.json                    # Configuration TypeScript
\`\`\`

## Architecture

### Frontend (Clients)

\`\`\`
Navbar (logo + menu) 
    ↓
Page d'accueil (hero + présentation)
    ↓
Catalogue produits (grille + filtres)
    ↓
Détails produit (images + prix + commander via WhatsApp)
    ↓
Page contact (WhatsApp + Instagram + email)
\`\`\`

### Backend (Admin)

\`\`\`
/admin/login (authentification Supabase Auth)
    ↓
/admin/dashboard (statistiques + liste produits)
    ↓
/admin/products/new (créer produit)
    ↓
/admin/products/[id]/edit (modifier produit)
\`\`\`

### API Routes

\`\`\`
GET /api/products                 # Tous les produits (public)
GET /api/products/[id]           # Un produit spécifique
GET /api/products/search         # Recherche/filtrage
POST /api/products               # Ajouter produit (admin)
PUT /api/products/[id]/edit      # Modifier produit (admin)
DELETE /api/products/[id]/delete # Supprimer produit (admin)
GET /api/admin/stats             # Statistiques (admin)
\`\`\`

## Flux de données

### Affichage des produits (public)

\`\`\`
Client visite /products
    ↓
Next.js récupère GET /api/products
    ↓
API se connecte à Supabase
    ↓
Supabase retourne les produits (sans doublure de compte)
    ↓
Affichage dans le navigateur
\`\`\`

### Ajout de produit (admin)

\`\`\`
Admin remplit le formulaire /admin/products/new
    ↓
Clique "Créer produit"
    ↓
Requête POST /api/products (authentification vérifiée)
    ↓
API vérifie que l'utilisateur est admin
    ↓
Images uploadées vers Supabase Storage
    ↓
Produit inséré dans la table "products"
    ↓
Admin redirigé vers /admin/dashboard
    ↓
Les clients voient immédiatement le produit
\`\`\`

## Sécurité (RLS - Row Level Security)

- **Produits** : Tout le monde peut lire, seuls les admins peuvent modifier/supprimer
- **Admin users** : Seuls les admins authentifiés peuvent lire
- **Authentification** : Supabase Auth JWT
- **Autorisation** : Vérification côté API + RLS côté base de données

## Performance

- **Images** : Optimisées par Next.js Image
- **Caching** : ISR (Incremental Static Regeneration) pour les produits
- **Code splitting** : Chaque page est un bundle séparé
- **Lazy loading** : Images lazy-loadées avec intersection observer
- **Database** : Indexes sur `category` et `created_at` pour requêtes rapides
