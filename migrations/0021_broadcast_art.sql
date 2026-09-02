-- Migration number: 0021 	 2026-09-02T00:00:00.000Z

-- Per-episode artwork override (admin-set image URL). When set it replaces the
-- AzuraCast replay-derived art for that broadcast's tiles/thumbnails. External
-- URLs are served proxied + CDN-cached via /media/ep/<broadcastId>/<hash>.jpg.

ALTER TABLE broadcast ADD COLUMN art TEXT;
