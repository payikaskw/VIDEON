# VIDEON

Streaming catalogue for films, series and general video. Public viewers do not need accounts. Admin access is opened by tapping the VIDEON logo six times.

## Stack
- Next.js App Router + TypeScript
- Neon PostgreSQL
- VidHold API catalog synchronization
- Vercel deployment

## Environment variables
- `DATABASE_URL`: Neon PostgreSQL connection string.
- `VIDHOLD_API_KEY`: VidHold API key (server-side only).
- `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_JWT_SECRET`: admin authentication.
- `CRON_SECRET`: random secret used to authorize the scheduled catalog sync endpoint.

## Database
For an existing deployment, run `db/migrations/002_vidhold_auto_catalog.sql` once in the Neon SQL Editor. For a fresh database, run `db/schema.sql` followed by the migration.

## VidHold automatic catalog
Upload videos in the VidHold account as usual. VIDEON reads the account catalog through VidHold `/api/file/list`, stores new file codes and metadata in Neon, and checks processing status through `/api/file/info`. The admin dashboard also syncs automatically while it is open and offers a manual sync action. The Vercel scheduled job is configured in `vercel.json`; its frequency depends on the Vercel plan. On Vercel Hobby, scheduled jobs can run only once per day, while an open admin dashboard checks every minute.

The admin dashboard does not provide local video upload or URL-import forms. Admin actions only hide, restore, or remove entries from the VIDEON catalog. Removing an entry from VIDEON does not delete the original VidHold file.

## Admin UI settings
The admin settings page controls brand name, tagline, homepage hero text, catalogue title, categories, footer text, and accent color. Settings are stored in Neon.

## Deploy
Import this repository into Vercel and configure the environment variables above. Run the database migration in Neon, then deploy.

## Important
Only publish videos you own or are authorized to distribute. VidHold processing and player availability depend on the provider's current API and account limits.
