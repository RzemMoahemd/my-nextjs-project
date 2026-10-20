-- ============================================================================
-- Migration 15 : Anti-doublon de reservation (double-clic / 2 onglets)
-- ----------------------------------------------------------------------------
-- PROBLEME : si 2 requetes "creer reservation" arrivent en meme temps pour la
-- meme variante du meme panier, 2 lignes sont creees et le stock est debite 2x.
-- Le panier n'affiche qu'UNE ligne -> stock perdu (retirer du panier ne rend
-- qu'1x, l'autre reservation reste orpheline).
-- FIX : contrainte d'unicite (cart_id, product_id, size, color) + fusion des
-- doublons existants avant de poser la contrainte.
-- A EXECUTER dans Supabase Dashboard > SQL Editor APRES la migration 14.
-- ============================================================================

-- 1. Fusionner les doublons existants (garde la plus ancienne, additionne, supprime les autres)
DO $$
DECLARE
  r RECORD;
  v_keep_id UUID;
  v_total INTEGER;
BEGIN
  FOR r IN
    SELECT cart_id, product_id, size, color, COUNT(*) AS n
    FROM cart_reservations
    GROUP BY cart_id, product_id, size, color
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO v_keep_id
    FROM cart_reservations
    WHERE cart_id = r.cart_id AND product_id = r.product_id
      AND size = r.size AND color = r.color
    ORDER BY created_at ASC
    LIMIT 1;

    SELECT COALESCE(SUM(quantity), 0) INTO v_total
    FROM cart_reservations
    WHERE cart_id = r.cart_id AND product_id = r.product_id
      AND size = r.size AND color = r.color;

    UPDATE cart_reservations
    SET quantity = v_total, updated_at = NOW()
    WHERE id = v_keep_id;

    DELETE FROM cart_reservations
    WHERE cart_id = r.cart_id AND product_id = r.product_id
      AND size = r.size AND color = r.color
      AND id <> v_keep_id;
  END LOOP;
END;
$$;

-- 2. Contrainte d'unicite : 1 seule reservation par variante et par panier
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uniq_cart_reservation_variant'
  ) THEN
    ALTER TABLE cart_reservations
    ADD CONSTRAINT uniq_cart_reservation_variant
    UNIQUE (cart_id, product_id, size, color);
  END IF;
END;
$$;
