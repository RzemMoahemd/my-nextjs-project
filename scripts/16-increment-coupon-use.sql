-- ============================================================================
-- Migration 16 : increment atomique des utilisations de coupon (N3/N4)
-- ----------------------------------------------------------------------------
-- A EXECUTER dans Supabase Dashboard > SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_coupon_use(
  p_code TEXT
) RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_current INTEGER;
  v_max INTEGER;
  v_active BOOLEAN;
  v_exp TIMESTAMPTZ;
BEGIN
  SELECT current_uses, max_uses, is_active, expiration_date
  INTO v_current, v_max, v_active, v_exp
  FROM coupons
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Coupon introuvable'::TEXT;
    RETURN;
  END IF;

  IF v_active IS DISTINCT FROM TRUE THEN
    RETURN QUERY SELECT FALSE, 'Coupon inactif'::TEXT;
    RETURN;
  END IF;

  IF v_exp IS NOT NULL AND v_exp < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Coupon expiré'::TEXT;
    RETURN;
  END IF;

  IF v_max IS NOT NULL AND COALESCE(v_current, 0) >= v_max THEN
    RETURN QUERY SELECT FALSE, 'Limite d''utilisation atteinte'::TEXT;
    RETURN;
  END IF;

  UPDATE coupons
  SET current_uses = COALESCE(current_uses, 0) + 1,
      updated_at = NOW()
  WHERE code = p_code;

  -- Si la limite vient d'etre atteinte, desactiver aussitot (sans trigger :
  -- UPDATE cible UNE ligne via WHERE code = ..., pas de boucle).
  UPDATE coupons
  SET is_active = FALSE,
      updated_at = NOW()
  WHERE code = p_code
    AND max_uses IS NOT NULL
    AND COALESCE(current_uses, 0) >= max_uses;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
    RETURN;
END;
$$ LANGUAGE plpgsql;
