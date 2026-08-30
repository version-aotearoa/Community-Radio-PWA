-- Migration number: 0016 2026-08-30

-- Per-episode description (shown on the archive/episode page and edited in
-- the tracklist editor alongside replay link and tracks).
ALTER TABLE broadcast ADD COLUMN description TEXT NOT NULL DEFAULT '';
