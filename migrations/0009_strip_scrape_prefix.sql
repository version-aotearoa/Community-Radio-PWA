-- Strip the "scrape-" prefix from show slugs (ids) and all dependent rows.
-- Idempotent: LIKE guards make re-runs no-ops.
UPDATE show SET id = substr(id, 8) WHERE id LIKE 'scrape-%';

UPDATE broadcast SET show_id = substr(show_id, 8) WHERE show_id LIKE 'scrape-%';

UPDATE track SET show_id = substr(show_id, 8) WHERE show_id LIKE 'scrape-%';

UPDATE broadcast SET id = replace(id, 'scrape-', '') WHERE id LIKE 'scrape-%';
