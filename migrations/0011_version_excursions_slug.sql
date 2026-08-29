-- Show slug: version-excursions-26-8-5 -> version-excursions.
-- show.id + referential links only; broadcast ids/episode URLs untouched.
-- Idempotent: exact-id guards make re-runs no-ops.
UPDATE show SET id = 'version-excursions' WHERE id = 'version-excursions-26-8-5';

UPDATE broadcast SET show_id = 'version-excursions' WHERE show_id = 'version-excursions-26-8-5';

UPDATE track SET show_id = 'version-excursions' WHERE show_id = 'version-excursions-26-8-5';

UPDATE saved_show SET show_id = 'version-excursions' WHERE show_id = 'version-excursions-26-8-5';
