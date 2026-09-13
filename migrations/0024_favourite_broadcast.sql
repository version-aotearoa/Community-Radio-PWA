-- Migration number: 0024 2026-09-13

-- Favourites on recordings (broadcasts). Sign-in required, one row per user
-- per recording. Separate from saved_episode (bookmarks) so the two actions
-- stay independent. The global count is public and derived from these rows.

CREATE TABLE IF NOT EXISTS favourite_broadcast (
	user_id TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
	broadcast_id TEXT NOT NULL REFERENCES broadcast (id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	PRIMARY KEY (user_id, broadcast_id)
);

CREATE INDEX IF NOT EXISTS idx_favourite_broadcast_broadcast ON favourite_broadcast (broadcast_id);
