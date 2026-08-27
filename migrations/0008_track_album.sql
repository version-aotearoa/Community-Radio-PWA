-- Migration number: 0008 2026-08-27

-- Bandcamp album id (for the album-scoped track embed: album=X/track=Y).
ALTER TABLE track ADD COLUMN album_id TEXT;
