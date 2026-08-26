-- Migration number: 0004 	 2026-08-26T10:35:00.000Z

-- Canonical AzuraCast on-demand play URL for a broadcast's recording.
-- Stored per airing (a recording is tied to a specific broadcast date).

ALTER TABLE broadcast ADD COLUMN replay_url TEXT;
