-- Re-point orphaned track.broadcast_id refs left behind by 0009's
-- broadcast id rename (scrape- prefix strip). Idempotent: only rows whose
-- stripped id still exists in broadcast are updated.
UPDATE track
SET broadcast_id = substr(broadcast_id, 8)
WHERE broadcast_id LIKE 'scrape-%'
  AND substr(broadcast_id, 8) IN (SELECT id FROM broadcast);
