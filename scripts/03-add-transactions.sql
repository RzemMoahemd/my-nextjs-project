-- ============================================================================
-- Migration 03 : Transactions PostgreSQL pour les opérations critiques sur le stock
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fonction : réserver un article dans le panier (stock + réservation atomiques)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reserve_cart_item(
  p_cart_id TEXT,
  p_product_id UUID,
  p_size TEXT,
  p_color TEXT,
  p_quantity INTEGER,
  p_expires_at TIMESTAMPTZ
) RETURNS TABLE (
  reservation_id UUID,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_variants JSONB;
  v_variant_index INTEGER;
  v_current_qty INTEGER;
  v_next_qty INTEGER;
  v_updated_variants JSONB;
  v_reservation_id UUID;
BEGIN
  SELECT variants INTO v_variants
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_variants IS NULL OR jsonb_typeof(v_variants) <> 'array' THEN
    RETURN QUERY SELECT NULL, FALSE, 'Produit introuvable ou variantes invalides';
  END IF;

  SELECT (idx - 1) INTO v_variant_index
  FROM jsonb_array_elements(v_variants) WITH ORDINALITY AS arr(elem, idx)
  WHERE (elem->>'size') = p_size
    AND (elem->>'color') = p_color
  LIMIT 1;

  IF v_variant_index IS NULL THEN
    RETURN QUERY SELECT NULL, FALSE, 'Variante introuvable';
  END IF;

  v_current_qty := COALESCE((v_variants->v_variant_index->>'quantity')::INTEGER, 0);
  v_next_qty := v_current_qty - p_quantity;

  IF v_next_qty < 0 THEN
    RETURN QUERY SELECT NULL, FALSE, 'Stock insuffisant';
  END IF;

  v_updated_variants := jsonb_set(
    v_variants,
    ARRAY[v_variant_index::TEXT, 'quantity'],
    to_jsonb(v_next_qty),
    true
  );

  UPDATE products
  SET variants = v_updated_variants,
      updated_at = NOW()
  WHERE id = p_product_id;

  INSERT INTO cart_reservations (cart_id, product_id, size, color, quantity, expires_at)
  VALUES (p_cart_id, p_product_id, p_size, p_color, p_quantity, p_expires_at)
  RETURNING id INTO v_reservation_id;

  RETURN QUERY SELECT v_reservation_id, TRUE, NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL, FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Fonction : libérer une réservation (restauration stock + suppression atomique)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION release_cart_reservation(
  p_reservation_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_reservation RECORD;
  v_variants JSONB;
  v_variant_index INTEGER;
  v_current_qty INTEGER;
  v_next_qty INTEGER;
  v_updated_variants JSONB;
BEGIN
  SELECT * INTO v_reservation
  FROM cart_reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Réservation introuvable';
  END IF;

  SELECT variants INTO v_variants
  FROM products
  WHERE id = v_reservation.product_id
  FOR UPDATE;

  IF v_variants IS NULL OR jsonb_typeof(v_variants) <> 'array' THEN
    RETURN QUERY SELECT FALSE, 'Produit introuvable';
  END IF;

  SELECT (idx - 1) INTO v_variant_index
  FROM jsonb_array_elements(v_variants) WITH ORDINALITY AS arr(elem, idx)
  WHERE (elem->>'size') = v_reservation.size
    AND (elem->>'color') = v_reservation.color
  LIMIT 1;

  IF v_variant_index IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Variante introuvable';
  END IF;

  v_current_qty := COALESCE((v_variants->v_variant_index->>'quantity')::INTEGER, 0);
  v_next_qty := v_current_qty + v_reservation.quantity;

  v_updated_variants := jsonb_set(
    v_variants,
    ARRAY[v_variant_index::TEXT, 'quantity'],
    to_jsonb(v_next_qty),
    true
  );

  UPDATE products
  SET variants = v_updated_variants,
      updated_at = NOW()
  WHERE id = v_reservation.product_id;

  DELETE FROM cart_reservations
  WHERE id = p_reservation_id;

  RETURN QUERY SELECT TRUE, NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Fonction : mettre à jour la quantité d'une réservation (stock + update atomique)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_cart_reservation_quantity(
  p_reservation_id UUID,
  p_new_quantity INTEGER,
  p_expires_at TIMESTAMPTZ
) RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_reservation RECORD;
  v_variants JSONB;
  v_variant_index INTEGER;
  v_current_qty INTEGER;
  v_next_qty INTEGER;
  v_updated_variants JSONB;
  v_delta INTEGER;
BEGIN
  -- Récupérer la réservation existante
  SELECT * INTO v_reservation
  FROM cart_reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Réservation introuvable';
  END IF;

  v_delta := p_new_quantity - v_reservation.quantity;

  IF v_delta = 0 THEN
    -- Pas de changement de quantité, juste mettre à jour l'expiration
    UPDATE cart_reservations
    SET expires_at = p_expires_at,
        updated_at = NOW()
    WHERE id = p_reservation_id;
    RETURN QUERY SELECT TRUE, NULL;
  END IF;

  -- Verrouiller le produit
  SELECT variants INTO v_variants
  FROM products
  WHERE id = v_reservation.product_id
  FOR UPDATE;

  IF v_variants IS NULL OR jsonb_typeof(v_variants) <> 'array' THEN
    RETURN QUERY SELECT FALSE, 'Produit introuvable';
  END IF;

  -- Trouver l'index de la variante
  SELECT (idx - 1) INTO v_variant_index
  FROM jsonb_array_elements(v_variants) WITH ORDINALITY AS arr(elem, idx)
  WHERE (elem->>'size') = v_reservation.size
    AND (elem->>'color') = v_reservation.color
  LIMIT 1;

  IF v_variant_index IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Variante introuvable';
  END IF;

  -- Calculer le nouveau stock (delta négatif = réserver plus, delta positif = libérer)
  v_current_qty := COALESCE((v_variants->v_variant_index->>'quantity')::INTEGER, 0);
  v_next_qty := v_current_qty - v_delta;

  IF v_next_qty < 0 THEN
    RETURN QUERY SELECT FALSE, 'Stock insuffisant';
  END IF;

  -- Mettre à jour les variantes
  v_updated_variants := jsonb_set(
    v_variants,
    ARRAY[v_variant_index::TEXT, 'quantity'],
    to_jsonb(v_next_qty),
    true
  );

  UPDATE products
  SET variants = v_updated_variants,
      updated_at = NOW()
  WHERE id = v_reservation.product_id;

  -- Mettre à jour la réservation
  UPDATE cart_reservations
  SET quantity = p_new_quantity,
      expires_at = p_expires_at,
      updated_at = NOW()
  WHERE id = p_reservation_id;

  RETURN QUERY SELECT TRUE, NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Fonction : créer une commande et supprimer les réservations associées (atomique)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_order_from_reservations(
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
BEGIN
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

  IF p_reservation_ids IS NOT NULL AND array_length(p_reservation_ids, 1) > 0 THEN
    DELETE FROM cart_reservations
    WHERE id = ANY(p_reservation_ids);
  END IF;

  RETURN QUERY SELECT v_order_id, TRUE, NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL, FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;