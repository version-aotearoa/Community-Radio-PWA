-- Migration number: 0020 	 2026-09-02T00:00:00.000Z

-- Admin 'checked & ready' flag on broadcast: when 1, the episode appears in
-- the homepage Latest Shows listing. Toggled per episode in Studio → Featured
-- (button labelled "latest") once the admin has checked replay/description/
-- tracklist. Distinct from `featured` (side-panel features, max 3).

ALTER TABLE broadcast ADD COLUMN home_ready INTEGER NOT NULL DEFAULT 0;
