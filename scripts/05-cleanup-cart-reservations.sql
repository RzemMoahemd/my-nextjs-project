-- ============================================================================
-- Migration 05 : Nettoyage des réservations expirées du panier
-- Supprime toutes les réservations dont expires_at < NOW()
-- Cette fonction peut être appelée manuellement, périodiquement (cron),
-- ou lors de l'ajout d'une nouvelle réservation.
-- ============================================================================

-- Fonction de nettoyage des réservations expirées
CREATE OR REPLACE FUNCTION cleanup_cart_reservations()
RETURNS TABLE (
  deleted_count INTEGER,
  last_deleted_at TIMESTAMPTZ
) AS $$
DECLARE
  v_deleted INTEGER := 0;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Supprimer les réservations expirées
  DELETE FROM cart_reservations
  WHERE expires_at < v_now;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Retourner le nombre de réservations supprimées
  RETURN QUERY SELECT
    v_deleted,
    COALESCE(
      (SELECT MAX(expires_at) FROM cart_reservations WHERE expires_at < v_now),
      v_now
    ) AS last_deleted_at;
END;
$$ LANGUAGE plpgsql;

-- Index pour optimiser la suppression
CREATE INDEX IF NOT EXISTS idx_cart_reservations_expires_at
ON cart_reservations (expires_at);

-- Commentaire de documentation
COMMENT ON FUNCTION cleanup_cart_reservations IS
  'Supprime toutes les réservations du panier dont la date d''expiration est passée.
  Retourne le nombre de réservations supprimées.';