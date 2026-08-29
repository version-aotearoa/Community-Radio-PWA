-- Saved shows: per-user bookmarks (sign-in required).
CREATE TABLE IF NOT EXISTS saved_show (
	user_id TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
	show_id TEXT NOT NULL REFERENCES show (id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (user_id, show_id)
);
