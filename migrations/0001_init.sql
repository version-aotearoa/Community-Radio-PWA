-- Migration number: 0001 	 2026-08-26T04:31:36.973Z

-- Version Radio domain schema.
-- The `user` table (with auth fields) is added by the auth migration in a later step.

CREATE TABLE IF NOT EXISTS show (
	id TEXT PRIMARY KEY NOT NULL,
	dj_id TEXT NOT NULL,
	title TEXT NOT NULL,
	description TEXT DEFAULT '',
	day_of_week INTEGER NOT NULL,
	start_minutes INTEGER NOT NULL,
	duration_minutes INTEGER NOT NULL DEFAULT 60,
	active INTEGER NOT NULL DEFAULT 1,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_show_dj ON show (dj_id);
CREATE INDEX IF NOT EXISTS idx_show_schedule ON show (day_of_week, start_minutes);

CREATE TABLE IF NOT EXISTS track (
	id TEXT PRIMARY KEY NOT NULL,
	show_id TEXT NOT NULL,
	position INTEGER NOT NULL,
	title TEXT NOT NULL,
	artist TEXT NOT NULL DEFAULT '',
	album TEXT NOT NULL DEFAULT '',
	duration_seconds INTEGER,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_track_show ON track (show_id, position);
