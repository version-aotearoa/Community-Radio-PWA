-- saved_show -> follow_show (show-level action becomes "follow").
-- New saved_episode: bookmarks for archive recordings.
ALTER TABLE saved_show RENAME TO follow_show;

CREATE TABLE IF NOT EXISTS saved_episode (
	user_id TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
	broadcast_id TEXT NOT NULL REFERENCES broadcast (id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (user_id, broadcast_id)
);
