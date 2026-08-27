-- Migration number: 0006 2026-08-27

-- Show artwork (AzuraCast/provided image URL) for the shows page cards.
ALTER TABLE show ADD COLUMN image TEXT;
