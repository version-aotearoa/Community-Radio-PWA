-- Migration number: 0022 2026-09-11

-- Bandcamp track stream + metadata, resolved on demand (via the Jina reader,
-- which bypasses Bandcamp's bot challenge for datacenter egress). The signed
-- stream URL expires (~24h), so stream_expires_at gates re-resolution.
ALTER TABLE track ADD COLUMN stream_url TEXT;
ALTER TABLE track ADD COLUMN stream_expires_at INTEGER;
ALTER TABLE track ADD COLUMN stream_format TEXT;
ALTER TABLE track ADD COLUMN stream_art_id TEXT;
ALTER TABLE track ADD COLUMN stream_capped INTEGER;
