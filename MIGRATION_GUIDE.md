# Guide de Migration - Système de Variantes et Gestion des Produits

## Résumé des Changements

### 1. **Système de Variantes (Couleur + Taille + Quantité)**
- **Avant**: L'inventaire était géré par taille uniquement (`inventory: { "S": 5, "M": 10 }`)
- **Après**: Chaque produit a des variantes avec couleur, taille et quantité
  ```json
  {
    "variants": [
      { "id": "uuid", "color": "Rouge", "size": "S", "quantity": 5 },
      { "id": "uuid", "color": "Bleu", "size": "M", "quantity": 10 }
    ]
  }
  ```

### 2. **Gestion des Badges**
- **Admin peut sélectionner**: 
  - `new` (Nouveau)
  - `top_sale` (Top vente)
- **Badge automatique**:
  - `promo` s'affiche automatiquement quand le stock total = 0

### 3. **Activation/Désactivation des Produits**
- **Nouveau champ**: `is_active` (boolean)
- **Remplace**: L'ancien système `in_stock`
- **Fonctionnement**: 
  - Produit actif (`is_active = true`) → Visible pour les clients
  - Produit désactivé (`is_active = false`) → Caché des clients

## Instructions de Migration

### Étape 1: Exécuter le Script SQL dans Supabase

1. Connectez-vous à votre dashboard Supabase
2. Allez dans **SQL Editor**
3. Copiez le contenu du fichier `supabase_migration.sql`
4. Exécutez le script
5. Vérifiez qu'il n'y a pas d'erreurs

### Étape 2: Vérifier la Migration

Après l'exécution du script SQL, vérifiez:

```sql
-- Vérifier que les colonnes ont été ajoutées
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('variants', 'is_active');

-- Vérifier les produits migrés
SELECT 
  id, 
  name, 
  is_active,
  jsonb_array_length(variants) as variant_count,
  get_product_total_stock(variants) as total_stock
FROM products
LIMIT 10;
```

### Étape 3: Tester l'Application

1. **Interface Admin**:
   - Créer un nouveau produit avec des variantes
   - Modifier un produit existant
   - Activer/désactiver un produit
   - Vérifier que le badge "Promo" n'est plus sélectionnable

2. **Interface Client**:
   - Vérifier que seuls les produits actifs sont visibles
   - Vérifier l'affichage des badges (Nouveau, Top vente, Promo)
   - Tester l'ajout au panier avec sélection de couleur et taille

### Étape 4: Nettoyage (Optionnel)

Une fois que tout fonctionne correctement, vous pouvez supprimer les anciennes colonnes:

```sql
-- ATTENTION: Faites une sauvegarde avant!
ALTER TABLE products DROP COLUMN IF EXISTS in_stock;
ALTER TABLE products DROP COLUMN IF EXISTS inventory;
```

## Modifications des Fichiers

### Fichiers Modifiés:
1. `lib/types.ts` - Nouveaux types pour variantes
2. `app/admin/products/new/page.tsx` - Interface de création avec variantes
3. `app/admin/products/[id]/edit/page.tsx` - Interface d'édition avec variantes
4. `app/admin/dashboard/page.tsx` - Affichage statut actif/désactivé
5. `components/product-card.tsx` - Sélection couleur + taille, badges automatiques

### Nouveaux Fichiers:
1. `supabase_migration.sql` - Script de migration de la base de données
2. `MIGRATION_GUIDE.md` - Ce guide

## Fonctionnalités Principales

### Pour l'Admin:

1. **Gestion des Variantes**:
   - Ajouter des couleurs et tailles
   - Créer des variantes (combinaison couleur + taille)
   - Définir la quantité pour chaque variante
   - Exemple: 5 pièces rouges en taille S, 10 pièces bleues en taille M

2. **Badges**:
   - Sélectionner "Nouveau" ou "Top vente"
   - Le badge "Promo" s'affiche automatiquement si stock = 0

3. **Activation/Désactivation**:
   - Bouton pour activer/désactiver un produit
   - Les produits désactivés ne sont pas visibles pour les clients

### Pour le Client:

1. **Sélection de Produit**:
   - Choisir une couleur
   - Choisir une taille
   - Voir le stock disponible pour cette combinaison

2. **Badges Visibles**:
   - "NOUVEAU" (si sélectionné par admin)
   - "TOP VENTE" (si sélectionné par admin)
   - "PROMO" (automatique si stock = 0)
   - Plusieurs badges peuvent s'afficher simultanément

## Exemples d'Utilisation

### Créer un Produit avec Variantes:

1. Remplir les informations de base
2. Ajouter des couleurs: Rouge, Bleu, Noir
3. Ajouter des tailles: S, M, L
4. Créer des variantes:
   - Rouge + S = 5 pièces
   - Rouge + M = 10 pièces
   - Bleu + S = 3 pièces
   - etc.
5. Sélectionner un badge (optionnel)
6. Cocher "Produit actif"
7. Sauvegarder

### Désactiver un Produit:

1. Aller dans le dashboard admin
2. Trouver le produit dans la liste
3. Cliquer sur le bouton "✓ Actif" → devient "✗ Désactivé"
4. Le produit disparaît immédiatement de la vue client

## Support

Si vous rencontrez des problèmes:

1. Vérifiez les logs de la console du navigateur
2. Vérifiez les logs Supabase
3. Assurez-vous que toutes les migrations SQL ont été exécutées
4. Vérifiez que les API routes sont à jour

## Notes Importantes

- Les anciennes commandes continuent de fonctionner (rétrocompatibilité)
- Les nouvelles commandes incluront la couleur sélectionnée
- Le stock est maintenant géré au niveau de chaque variante
- Un produit peut avoir plusieurs badges affichés simultanément