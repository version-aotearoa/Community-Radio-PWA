-- Migration number: 0019 	 2026-09-01T00:00:00.000Z

-- Split show "description" into a short plain-text card blurb (description,
-- max 50 chars) and rich HTML page content (page_content, shown only on the
-- show page). Existing rich descriptions move to page_content. The plain-text
-- blurb is derived at read time (descriptionToText + 50-char slice in
-- sanitizeShowRow), so legacy HTML in `description` needs no SQL transform here.

ALTER TABLE show ADD COLUMN page_content TEXT DEFAULT '';

-- Preserve existing rich content as the page body.
UPDATE show SET page_content = description WHERE description <> '';
