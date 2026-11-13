-- VIDEON initial schema — Neon PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admins (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 username VARCHAR(80) UNIQUE NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 name VARCHAR(80) UNIQUE NOT NULL,
 slug VARCHAR(100) UNIQUE NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS videos (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 title VARCHAR(180) NOT NULL,
 slug VARCHAR(220) UNIQUE NOT NULL,
 description TEXT,
 type VARCHAR(30) NOT NULL DEFAULT 'video' CHECK (type IN ('film','serial','anime','documenter','hiburan','video')),
 category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
 thumbnail_url TEXT,
 year SMALLINT,
 duration_seconds INTEGER,
 provider VARCHAR(30) NOT NULL DEFAULT 'vidhold',
 provider_file_code VARCHAR(100),
 embed_url TEXT,
 source_url TEXT,
 status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','processing','published','hidden','failed')),
 featured BOOLEAN NOT NULL DEFAULT FALSE,
 views BIGINT NOT NULL DEFAULT 0,
 published_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS series (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 title VARCHAR(180) NOT NULL,
 slug VARCHAR(220) UNIQUE NOT NULL,
 description TEXT,
 poster_url TEXT,
 status VARCHAR(20) NOT NULL DEFAULT 'draft',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seasons (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
 season_number INTEGER NOT NULL,
 title VARCHAR(180),
 UNIQUE(series_id,season_number)
);

CREATE TABLE IF NOT EXISTS episodes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
 video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 episode_number INTEGER NOT NULL,
 title VARCHAR(180),
 UNIQUE(season_id,episode_number)
);

CREATE TABLE IF NOT EXISTS banners (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 title VARCHAR(180) NOT NULL,
 subtitle TEXT,
 image_url TEXT,
 video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
 sort_order INTEGER NOT NULL DEFAULT 0,
 active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS site_settings (
 key VARCHAR(100) PRIMARY KEY,
 value JSONB NOT NULL DEFAULT '{}'::jsonb,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upload_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 provider VARCHAR(30) NOT NULL DEFAULT 'vidhold',
 file_code VARCHAR(100) UNIQUE NOT NULL,
 source_url TEXT,
 title VARCHAR(180) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'queued',
 last_checked_at TIMESTAMPTZ,
 raw_response JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS videos_public_idx ON videos(status,published_at DESC);
CREATE INDEX IF NOT EXISTS videos_category_idx ON videos(category_id);
CREATE INDEX IF NOT EXISTS upload_jobs_status_idx ON upload_jobs(status,created_at);

INSERT INTO categories(name,slug) VALUES
 ('Film','film'),('Serial','serial'),('Anime','anime'),('Dokumenter','dokumenter'),('Hiburan','hiburan'),('Video','video')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO site_settings(key,value) VALUES
 ('brand', '{"name":"VIDEON","tagline":"WATCH EVERYTHING. ANYTIME."}'::jsonb),
 ('appearance', '{"accent":"#e11d48","theme":"dark"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
