-- VIDEON: VidHold auto catalog synchronization and editable site UI.
-- Run once in the Neon SQL Editor.
CREATE UNIQUE INDEX IF NOT EXISTS videos_provider_file_code_uidx
  ON videos(provider_file_code)
  WHERE provider_file_code IS NOT NULL;

INSERT INTO site_settings(key,value)
VALUES (
  'site_ui',
  '{"brandName":"VIDEON","tagline":"WATCH EVERYTHING. ANYTIME.","heroEyebrow":"Your next watch starts here","heroTitle":"EVERY STORY. ONE PLACE.","heroDescription":"Temukan film, serial, anime, dokumenter, dan video pilihan. Pilih tontonanmu dan nikmati ceritanya.","sectionTitle":"Pilihan untuk ditonton","categories":["Film","Serial","Anime","Dokumenter","Hiburan","Video"],"footerText":"Watch responsibly. Only authorized content.","accent":"#e11d48"}'::jsonb
)
ON CONFLICT(key) DO NOTHING;
