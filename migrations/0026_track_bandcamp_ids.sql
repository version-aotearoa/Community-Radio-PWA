-- Migration number: 0026 2026-09-16

-- Cached Bandcamp numeric ids (from the public search API) so re-resolving a
-- downloaded stream URL can call tralbum_details directly and skip the search
-- step. Null until a track has been resolved at least once.

ALTER TABLE track ADD COLUMN bandcamp_band_id INTEGER;
ALTER TABLE track ADD COLUMN bandcamp_tralbum_id INTEGER;
