-- =================================================
-- Seuil de stock faible par produit : optionnel
-- =================================================
-- Un produit sans seuil (NULL) hérite du seuil global
-- défini dans Paramètres > Vente (settings -> stock.low_stock_threshold).
--
-- À exécuter une fois dans Supabase (SQL Editor).

-- 1. Supprimer le DEFAULT 5 : les produits créés sans seuil
--    explicite auront NULL (= héritage du seuil global).
ALTER TABLE products
  ALTER COLUMN low_stock_threshold DROP DEFAULT;

-- 2. (Optionnel) Les produits qui portent encore la valeur 5 d'origine
--    (jamais personnalisée) peuvent repasser en héritage du seuil global.
--    À n'exécuter que si vous ne voulez garder que les overrides explicites :
-- UPDATE products SET low_stock_threshold = NULL WHERE low_stock_threshold = 5;