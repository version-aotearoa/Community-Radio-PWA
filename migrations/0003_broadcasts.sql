-- Migration number: 0003 	 2026-08-26T05:36:37.456Z

-- Per-broadcast tracklists. A show recurs every `interval_weeks` (1 = weekly,
-- 4 = every 4th week) anchored at `anchor_date`; each airing is a `broadcast`
-- row with its own tracklist (track.broadcast_id).

ALTER TABLE show ADD COLUMN interval_weeks INTEGER NOT NULL DEFAULT 1 CHECK (interval_weeks >= 1);
ALTER TABLE show ADD COLUMN anchor_date TEXT;

CREATE TABLE IF NOT EXISTS broadcast (
	id TEXT PRIMARY KEY NOT NULL,
	show_id TEXT NOT NULL,
	date TEXT NOT NULL,
	start_minutes INTEGER NOT NULL,
	duration_minutes INTEGER NOT NULL,
	interval_weeks INTEGER NOT NULL DEFAULT 1,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
	UNIQUE (show_id, date)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_show ON broadcast (show_id, date);
CREATE INDEX IF NOT EXISTS idx_broadcast_date ON broadcast (date);

-- tracklist now belongs to a broadcast (airing) rather than a show.
ALTER TABLE track ADD COLUMN broadcast_id TEXT;

CREATE INDEX IF NOT EXISTS idx_track_broadcast ON track (broadcast_id);
