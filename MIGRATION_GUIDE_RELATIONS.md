# 🔄 GUIDE DE MIGRATION - Relations Produits/Catégories

## 📋 Vue d'ensemble
Migration progressive vers un modèle relationnel avec références ID au lieu de strings.

## 🗂️ Scripts créés
- `scripts/backup-current-data.sql` - Sauvegarde des données actuelles
- `scripts/add-reference-columns.sql` - Ajout des nouvelles colonnes
- `scripts/migrate-category-data.sql` - Migration des données existantes

## 🚀 Phase 1: Sauvegarde (URGENT - À faire maintenant)

```bash
# Exécuter le script de sauvegarde
psql -d votre_base -f scripts/backup-current-data.sql
```

**Vérifications après sauvegarde:**
```sql
-- Vérifier les tables de sauvegarde
SELECT COUNT(*) FROM categories_backup;  -- Devrait = nombre de catégories
SELECT COUNT(*) FROM products_backup;    -- Devrait = nombre de produits
```

## 🚀 Phase 2: Ajout des colonnes

```bash
# Ajouter les nouvelles colonnes (sans casser l'existant)
psql -d votre_base -f scripts/add-reference-columns.sql
```

**Vérifications:**
```sql
-- Les nouvelles colonnes doivent exister
\d products  -- Vérifier category_id, subcategory_id, subsubcategory_id
```

## 🚀 Phase 3: Migration des données

```bash
# Migrer les données existantes
psql -d votre_base -f scripts/migrate-category-data.sql
```

**Vérifications:**
```sql
-- Comptage des migrations réussies
SELECT COUNT(*) FROM products WHERE category_id IS NOT NULL;
SELECT COUNT(*) FROM products WHERE subcategory_id IS NOT NULL;

-- Vérifier l'intégrité
SELECT p.name, p.category, c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.category_id IS NOT NULL
LIMIT 5;
```

## 🔍 Tests fonctionnels (Après chaque phase)

### Test 1: Interface admin fonctionne
- [ ] Connexion admin OK
- [ ] Gestion catégories accessible
- [ ] Comptage produits visible

### Test 2: Boutique fonctionne
- [ ] Page produits charge
- [ ] Filtres par catégorie fonctionnent
- [ ] Produits détaillés s'affichent

### Test 3: Intégrité données
```sql
-- Pas de produits orphelins
SELECT COUNT(*) FROM products WHERE category_id IS NOT NULL
AND category_id NOT IN (SELECT id FROM categories);
```

## 🔄 Rollback si problème

```sql
-- Restaurer depuis backup
DROP TABLE IF EXISTS products;
ALTER TABLE products_backup RENAME TO products;

DROP TABLE IF EXISTS categories;
ALTER TABLE categories_backup RENAME TO categories;
```

## 🎯 Prochaines étapes (Phase 4+)

Après validation des phases 1-3:
- ✅ Modification des APIs pour utiliser les jointures
- ✅ Update des composants frontend
- ✅ Suppression des anciennes colonnes
- ✅ Tests complets

## ⚠️ Points d'attention

1. **Sauvegarde obligatoire** avant toute modification
2. **Tests après chaque phase** - rollback possible
3. **Sous-catégories** : stratégie "premier élément" - à adapter si besoin
4. **Performance** : nouveaux index créés automatiquement

## 📞 Support

En cas de problème à une phase:
1. Vérifier les logs de la commande psql
2. Consulter les tables de backup
3. Rollback possible vers état initial
