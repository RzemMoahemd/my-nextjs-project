-- ============================================================================
-- Migration 17 : re-validatation des reservations a la creation de commande (N6)
-- ----------------------------------------------------------------------------
-- PROBLEME : si la reservation expire entre le panier et le clic "valider",
-- le stock est deja revenu en vente mais la commande se cree quand meme
-- SANS bloquer de stock -> survente possible du dernier article.
-- FIX : nouvelle fonction atomique `confirm_order_reservations` qui, DANS UNE
-- SEULE TRANSACTION : verrouille les produits, re-bloque le stock des
-- reservations expirees/manquantes si possible, supprime les reservations
-- consommees, cree la commande. Si le stock manque -> echec propre, rien
-- n'est cree, le client recoit "panier expire / stock insuffisant".
-- A EXECUTER dans Supabase Dashboard > SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION confirm_order_reservations(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_address TEXT,
  p_postal_code TEXT,
  p_city TEXT,
  p_items JSONB,
  p_total_amount NUMERIC,
  p_delivery_fee NUMERIC,
  p_notes TEXT,
  p_coupon_code TEXT,
  p_coupon_discount NUMERIC,
  p_free_shipping_from_coupon BOOLEAN,
  p_user_id UUID,
  p_reservation_ids UUID[]
) RETURNS TABLE (
  order_id UUID,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_size TEXT;
  v_color TEXT;
  v_qty INTEGER;
  v_variants JSONB;
  v_idx INTEGER;
  v_current INTEGER;
  v_next INTEGER;
  v_updated JSONB;
  v_res_id UUID;
  v_found BOOLEAN;
BEGIN
  -- 1. Pour chaque article : verifier/re-bloquer le stock atomiquement
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_size := v_item->>'size';
    v_color := COALESCE(v_item->>'color', 'Standard');
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_product_id IS NULL OR v_size IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Article invalide dans la commande'::TEXT;
      RETURN;
    END IF;

    -- La reservation de CET article existe-t-elle encore (non expiree) ?
    v_found := FALSE;
    IF p_reservation_ids IS NOT NULL AND array_length(p_reservation_ids, 1) > 0 THEN
      SELECT TRUE INTO v_found
      FROM cart_reservations
      WHERE id = ANY(p_reservation_ids)
        AND product_id = v_product_id
        AND size = v_size
        AND color = v_color
        AND expires_at > NOW()
      LIMIT 1;
    END IF;

    -- Verrouiller le produit
    SELECT variants INTO v_variants
    FROM products
    WHERE id = v_product_id
    FOR UPDATE;

    IF v_variants IS NULL OR jsonb_typeof(v_variants) <> 'array' THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Produit introuvable'::TEXT;
      RETURN;
    END IF;

    SELECT (idx - 1) INTO v_idx
    FROM jsonb_array_elements(v_variants) WITH ORDINALITY AS arr(elem, idx)
    WHERE (elem->>'size') = v_size
      AND (elem->>'color') = v_color
    LIMIT 1;

    IF v_idx IS NULL THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Variante introuvable'::TEXT;
      RETURN;
    END IF;

    v_current := COALESCE((v_variants->v_idx->>'quantity')::INTEGER, 0);

    IF v_found THEN
      -- Reservation encore valide : le stock est DEJA deduit, rien a re-bloquer.
      NULL;
    ELSE
      -- Reservation expiree ou absente : re-bloquer le stock maintenant.
      v_next := v_current - v_qty;
      IF v_next < 0 THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Stock insuffisant (reservation expiree)'::TEXT;
        RETURN;
      END IF;
      v_updated := jsonb_set(v_variants, ARRAY[v_idx::TEXT, 'quantity'], to_jsonb(v_next), true);
      UPDATE products
      SET variants = v_updated, updated_at = NOW()
      WHERE id = v_product_id;
      PERFORM log_stock_movement(v_product_id, v_size, v_color, -v_qty, 'order_confirm', NULL);
    END IF;
  END LOOP;

  -- 2. Creer la commande
  INSERT INTO orders (
    customer_name, customer_phone, customer_email,
    address, postal_code, city,
    items, total_amount, delivery_fee, notes,
    status, coupon_code, coupon_discount, free_shipping_from_coupon, user_id
  ) VALUES (
    p_customer_name, p_customer_phone, p_customer_email,
    p_address, p_postal_code, p_city,
    p_items, p_total_amount, p_delivery_fee, p_notes,
    'pending', p_coupon_code, p_coupon_discount, p_free_shipping_from_coupon, p_user_id
  )
  RETURNING id INTO v_order_id;

  -- 3. Supprimer les reservations consommees (meme expirees, pour nettoyer)
  IF p_reservation_ids IS NOT NULL AND array_length(p_reservation_ids, 1) > 0 THEN
    DELETE FROM cart_reservations
    WHERE id = ANY(p_reservation_ids);
  END IF;

  RETURN QUERY SELECT v_order_id, TRUE, NULL::TEXT;
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM;
    RETURN;
END;
$$ LANGUAGE plpgsql;
