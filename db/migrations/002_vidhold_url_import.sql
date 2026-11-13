-- VIDEON migration: switch new video records to Vidhold URL import.
-- Existing DoodStream records are intentionally preserved and are NOT relabeled.
ALTER TABLE videos ALTER COLUMN provider SET DEFAULT 'vidhold';
ALTER TABLE upload_jobs ALTER COLUMN provider SET DEFAULT 'vidhold';
CREATE INDEX IF NOT EXISTS videos_provider_status_idx
  ON videos(provider, status, created_at DESC);
CREATE INDEX IF NOT EXISTS upload_jobs_provider_status_idx
  ON upload_jobs(provider, status, created_at DESC);
