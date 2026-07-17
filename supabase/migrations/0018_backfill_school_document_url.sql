-- Older alumni registrations stored proof of schooling in website_url.
-- Backfill the dedicated column so approval/detail screens can show the right document.
UPDATE profiles
SET school_document_url = website_url
WHERE school_document_url IS NULL
  AND website_url IS NOT NULL
  AND (
    website_url ILIKE '%/storage/v1/object/%'
    OR website_url ILIKE '%school%'
    OR website_url ILIKE '%document%'
    OR website_url ILIKE '%proof%'
  );
