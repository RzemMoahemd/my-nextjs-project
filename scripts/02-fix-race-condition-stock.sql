-- ============================================================================
-- Migration 02 : Correction de la race condition sur le stock
-- Remplace la lecture-écriture séparée par une fonction PostgreSQL atomique
-- avec verrouillage de ligne (SELECT ... FOR UPDATE).
-- ============================================================================

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
  -- Verrouiller la ligne produit pour éviter les écritures concurrentes
  SELECT variants INTO v_variants
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_variants IS NULL OR jsonb_typeof(v_variants) <> 'array' THEN
    RETURN QUERY SELECT 0, FALSE, 'Produit introuvable ou variantes invalides';
  END IF;

  -- Trouver l'index de la variante (taille + couleur)
  SELECT (idx - 1) INTO v_variant_index
  FROM jsonb_array_elements(v_variants) WITH ORDINALITY AS arr(elem, idx)
  WHERE (elem->>'size') = p_size
    AND (elem->>'color') = p_color
  LIMIT 1;

  IF v_variant_index IS NULL THEN
    RETURN QUERY SELECT 0, FALSE, 'Variante introuvable';
  END IF;

  -- Quantité actuelle
  v_current_qty := COALESCE((v_variants->v_variant_index->>'quantity')::INTEGER, 0);
  v_next_qty := v_current_qty + p_delta;

  -- Refuser si le stock deviendrait négatif
  IF v_next_qty < 0 THEN
    RETURN QUERY SELECT v_current_qty, FALSE, 'Stock insuffisant';
  END IF;

  -- Mettre à jour la quantité de la variante (jsonb_set avec chemin text[])
  v_updated_variants := jsonb_set(
    v_variants,
    ARRAY[v_variant_index::TEXT, 'quantity'],
    to_jsonb(v_next_qty),
    true
  );

  -- Mettre à jour le produit
  UPDATE products
  SET variants = v_updated_variants,
      updated_at = NOW()
  WHERE id = p_product_id;

  RETURN QUERY SELECT v_next_qty, TRUE, NULL;
END;
$$ LANGUAGE plpgsql;

-- Commentaire pour documentation
COMMENT ON FUNCTION adjust_inventory_quantity(UUID, TEXT, TEXT, INTEGER) IS
  'Ajuste le stock d’une variante de manière atomique avec verrouillage de ligne. Refuse si le stock deviendrait négatif.';