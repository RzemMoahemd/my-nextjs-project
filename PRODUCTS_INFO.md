# À propos des produits de votre boutique

## Les produits sont-ils statiques ou dynamiques ?

### Réponse : **100% DYNAMIQUES**

Les produits de votre boutique ELEGANCE sont **entièrement stockés dans la base de données Supabase**, pas dans le code de votre site web.

## Où sont stockés les produits ?

- **Base de données** : Table `products` dans PostgreSQL (Supabase)
- **Images** : Supabase Storage (bucket `products`)
- **Gestion** : Via le back-office admin à `/admin/dashboard`

## Flux de données

\`\`\`
Admin ajoute un produit via /admin/dashboard
        ↓
Les données sont envoyées à l'API Next.js
        ↓
L'API sauvegarde dans Supabase (PostgreSQL)
        ↓
Les images sont stockées dans Supabase Storage
        ↓
Les clients voient les produits en visitant /products
        ↓
Les données sont récupérées en temps réel depuis Supabase
\`\`\`

## Produits de test

Au démarrage, 6 produits de test ont été ajoutés directement dans la base de données :

1. **T-Shirt Premium Noir** - 29,99€
2. **Jean Slim Bleu** - 59,99€
3. **Hoodie Gris** - 49,99€
4. **Chemise Blanche** - 44,99€
5. **Pantalon Chino Beige** - 54,99€
6. **Veste Noire** - 89,99€ (rupture de stock)

Ces produits sont dans **`scripts/03-sample-products.sql`** et ont été insérés via une migration Supabase.

## Ajouter / Modifier / Supprimer des produits

### Via l'interface admin (recommandé)

1. Allez à `/admin/login`
2. Connectez-vous avec vos identifiants admin
3. Dans le dashboard, cliquez sur "Ajouter un produit"
4. Remplissez les informations et téléchargez les images
5. Les données sont immédiatement sauvegardées dans Supabase

### Via SQL direct (avancé)

Vous pouvez aussi exécuter des requêtes SQL dans Supabase SQL Editor :

\`\`\`sql
-- Ajouter un produit
INSERT INTO products (name, description, price, category, sizes, in_stock) 
VALUES (
  'Mon nouveau produit',
  'Description du produit',
  49.99,
  'T-Shirts',
  ARRAY['S', 'M', 'L', 'XL'],
  true
);

-- Voir tous les produits
SELECT * FROM products ORDER BY created_at DESC;

-- Modifier un produit
UPDATE products 
SET name = 'Nouveau nom', price = 59.99 
WHERE id = 'YOUR_PRODUCT_ID';

-- Supprimer un produit
DELETE FROM products WHERE id = 'YOUR_PRODUCT_ID';
\`\`\`

## Aucun code à modifier

Contrairement aux sites statiques, **vous ne devez pas modifier le code** pour ajouter des produits. Tout se fait :

- Via l'interface admin (`/admin/dashboard`)
- Ou via Supabase directement

Le site récupère automatiquement les produits de la base de données à chaque visite !

## Avantages d'avoir une base de données

✅ Ajouter/modifier/supprimer des produits sans coder
✅ Gérer les images directement via l'interface
✅ Tracer l'historique des produits (dates de création)
✅ Filtrer et rechercher rapidement les produits
✅ Gérer le stock facilement (in_stock: true/false)
✅ Scalabilité : votre site peut gérer 1000+ produits sans problème
