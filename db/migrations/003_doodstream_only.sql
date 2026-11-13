-- Enforce DoodStream as the only active video provider.
ALTER TABLE videos ALTER COLUMN provider SET DEFAULT 'doodstream';
ALTER TABLE upload_jobs ALTER COLUMN provider SET DEFAULT 'doodstream';

-- Legacy VidHold catalogue entries must not remain publicly playable.
UPDATE videos
SET status='hidden', published_at=NULL, updated_at=NOW()
WHERE provider <> 'doodstream' AND status='published';
