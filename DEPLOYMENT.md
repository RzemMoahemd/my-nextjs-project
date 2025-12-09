# Guide de Déploiement sur Vercel

## 1. Préparer le code

\`\`\`bash
git add .
git commit -m "Initial commit: ELEGANCE store"
git push origin main
\`\`\`

## 2. Créer un projet sur Vercel

1. Aller sur [vercel.com](https://vercel.com)
2. Cliquer "New Project"
3. Importer le repository GitHub
4. Configurer les variables d'environnement

## 3. Ajouter les variables d'environnement sur Vercel

Dans Vercel Settings → Environment Variables:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
POSTGRES_URL=your_postgres_url
POSTGRES_PRISMA_URL=your_postgres_prisma_url
POSTGRES_URL_NON_POOLING=your_postgres_url_non_pooling
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DATABASE=your_database
POSTGRES_HOST=your_host
\`\`\`

## 4. Configurer Supabase Storage

Créer un bucket "products" public pour les images des produits.

## 5. Vérifier le déploiement

- Aller sur votre domaine Vercel
- Tester la page d'accueil
- Tester le login admin
- Ajouter un produit de test

## Performance

- Build time: ~20-30s (Turbopack)
- First Contentful Paint: <1s
- Lighthouse score: 95+

## Support et Monitoring

1. Activer Vercel Analytics
2. Configurer les erreurs avec Sentry (optionnel)
3. Monitorer les logs Supabase

## Mise à jour du domaine

1. Acheter un domaine personnalisé
2. Aller sur Vercel Settings → Domains
3. Ajouter le domaine personnalisé
4. Configurer les DNS records
