-- ============================================================================
-- Migration 18 : decrement des utilisations de coupon + auto-desactivation (N4/N5)
-- ----------------------------------------------------------------------------
-- decrement_coupon_use : rend UN usage (compensation quand la commande echoue
-- APRES avoir consomme l'usage). Ne descend jamais sous 0.
-- + trigger : desactive automatiquement (is_active=false) un coupon des que
-- sa date d'expiration est passee ou que sa limite est atteinte.
-- A EXECUTER dans Supabase Dashboard > SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION decrement_coupon_use(
  p_code TEXT
) RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
) AS $$
BEGIN
  UPDATE coupons
  SET current_uses = GREATEST(COALESCE(current_uses, 0) - 1, 0),
      updated_at = NOW()
  WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Coupon introuvable'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Auto-desactivation des coupons expires ou epuises (N5).
-- PAS de trigger : un trigger AFTER UPDATE qui fait lui-meme un UPDATE sur la
-- meme table se redeclenche en boucle -> "stack depth limit exceeded".
-- A la place : appele manuellement (ci-dessous) + rappele par les fonctions
-- increment_coupon_use / decrement_coupon_use (elles modifient UNE ligne via
-- WHERE code = ..., sans redeclencher de boucle).
CREATE OR REPLACE FUNCTION auto_deactivate_coupons()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE coupons
  SET is_active = FALSE,
      updated_at = NOW()
  WHERE is_active = TRUE
    AND (
      (expiration_date IS NOT NULL AND expiration_date < NOW())
      OR (max_uses IS NOT NULL AND COALESCE(current_uses, 0) >= max_uses)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger boucle infini si le script 18 v1 l'a partiellement cree.
DROP TRIGGER IF EXISTS auto_deactivate_coupons_trigger ON coupons;
DROP FUNCTION IF EXISTS trg_auto_deactivate_coupons();

-- Nettoyage immediat : desactive WELCOME10 (expire 13/10) et autres expires.
SELECT auto_deactivate_coupons();
