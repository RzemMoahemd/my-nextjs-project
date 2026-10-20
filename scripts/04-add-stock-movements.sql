-- ============================================================================
-- Migration 04 : Table d'historique des mouvements de stock
-- Trace chaque modification de stock (réservation, libération, commande, annulation, retour, etc.)
-- ============================================================================

-- Table stock_movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_size TEXT NOT NULL,
  variant_color TEXT NOT NULL DEFAULT 'Standard',
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reason ON stock_movements(reason);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_id);

-- Commentaires pour documentation
COMMENT ON TABLE stock_movements IS 'Historique complet de tous les mouvements de stock';
COMMENT ON COLUMN stock_movements.quantity_change IS 'Quantité ajoutée (+) ou retirée (-) du stock';
COMMENT ON COLUMN stock_movements.reason IS 'Motif : reservation, release, update_reservation, order_cancellation, order_return, admin_adjust, expired_reservation';
COMMENT ON COLUMN stock_movements.reference_id IS 'Référence vers la réservation ou commande liée';

-- Fonction utilitaire pour insérer un mouvement de stock
CREATE OR REPLACE FUNCTION log_stock_movement(
  p_product_id UUID,
  p_variant_size TEXT,
  p_variant_color TEXT,
  p_quantity_change INTEGER,
  p_reason TEXT,
  p_reference_id TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO stock_movements (
    product_id, variant_size, variant_color, quantity_change, reason, reference_id
  ) VALUES (
    p_product_id, p_variant_size, p_variant_color, p_quantity_change, p_reason, p_reference_id
  );
END;
$$ LANGUAGE plpgsql;

-- --- Fonction T01 : adjust_inventory_quantity (avec log de mouvement) ---
CREATE OR REPLACE FUNCTION adjust_inventory_quantity(
  p_product_id UUID,
  p_size TEXT,
  p_color TEXT,
  p_delta INTEGER
) RETURNS TABLE (
  new_quantity INTEGER,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_variants JSONB;
  v_variant_index INTEGER;
  v_current_qty INTEGER;
  v_next_qty INTEGER;
  v_updated_variants JSONB;
BEGIN
  SELECT variants INTO v_variants
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_variants IS NULL OR jsonb_typeof(v_variants) <> 'array' THEN
    RETURN QUERY SELECT 0, FALSE, 'Produit introuvable ou variantes invalides';
  END IF;

  SELECT (idx - 1) INTO v_variant_index
  FROM jsonb_array_elements(v_variants) WITH ORDINALITY AS arr(elem, idx)
  WHERE (elem->>'size') = p_size
    AND (elem->>'color') = p_color
  LIMIT 1;

  IF v_variant_index IS NULL THEN
    RETURN QUERY SELECT 0, FALSE, 'Variante introuvable';
  END IF;

  v_current_qty := COALESCE((v_variants->v_variant_index->>'quantity')::INTEGER, 0);
  v_next_qty := v_current_qty + p_delta;

  IF v_next_qty < 0 THEN
    RETURN QUERY SELECT v_current_qty, FALSE, 'Stock insuffisant';
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

  -- Log du mouvement de stock
  PERFORM log_stock_movement(
    p_product_id,
    p_size,
    p_color,
    p_delta,
    CASE WHEN p_delta > 0 THEN 'admin_adjust' ELSE 'reservation' END,
    NULL
  );

  RETURN QUERY SELECT v_next_qty, TRUE, NULL;
END;
$$ LANGUAGE plpgsql;

-- --- Fonction T05 : reserve_cart_item (avec log de mouvement) ---
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

  -- Log du mouvement de stock
  PERFORM log_stock_movement(
    p_product_id,
    p_size,
    p_color,
    -p_quantity,
    'reservation',
    v_reservation_id::TEXT
  );

  RETURN QUERY SELECT v_reservation_id, TRUE, NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL, FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- --- Fonction T05 : release_cart_reservation (avec log de mouvement) ---
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

  -- Log du mouvement de stock
  PERFORM log_stock_movement(
    v_reservation.product_id,
    v_reservation.size,
    v_reservation.color,
    v_reservation.quantity,
    'release',
    p_reservation_id::TEXT
  );

  RETURN QUERY SELECT TRUE, NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- --- Fonction T05 : update_cart_reservation_quantity (avec log de mouvement) ---
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
  SELECT * INTO v_reservation
  FROM cart_reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Réservation introuvable';
  END IF;

  v_delta := p_new_quantity - v_reservation.quantity;

  IF v_delta = 0 THEN
    UPDATE cart_reservations
    SET expires_at = p_expires_at,
        updated_at = NOW()
    WHERE id = p_reservation_id;
    RETURN QUERY SELECT TRUE, NULL;
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
  v_next_qty := v_current_qty - v_delta;

  IF v_next_qty < 0 THEN
    RETURN QUERY SELECT FALSE, 'Stock insuffisant';
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
  WHERE id = v_reservation.product_id;

  UPDATE cart_reservations
  SET quantity = p_new_quantity,
      expires_at = p_expires_at,
      updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Log du mouvement de stock
  PERFORM log_stock_movement(
    v_reservation.product_id,
    v_reservation.size,
    v_reservation.color,
    -v_delta,
    'update_reservation',
    p_reservation_id::TEXT
  );

  RETURN QUERY SELECT TRUE, NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;