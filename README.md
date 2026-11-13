# VIRALINDO

Streaming catalogue for films, series and general video. Public viewers do not need accounts. Admin access is opened by tapping the VIRALINDO logo six times.

## Stack
- Next.js App Router + TypeScript
- Neon PostgreSQL
- DoodStream API for video hosting, uploads, playback and catalog synchronization
- Vercel deployment

## Environment variables
- `DATABASE_URL`: Neon PostgreSQL connection string.
- `DOODSTREAM_API_KEY`: DoodStream API key (server-side only; add it to Vercel and the upload worker).
- `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_JWT_SECRET`: admin authentication.
- `CRON_SECRET`: random secret used to authorize scheduled catalog synchronization.
- `VIDEO_WORKER_URL` and `UPLOAD_WORKER_SECRET`: required for browser-to-worker local uploads.
- `APP_ORIGIN`: set on the upload worker to the production VIRALINDO origin.

## DoodStream setup
1. Create or sign in to a DoodStream account and copy its API key from account settings.
2. Add `DOODSTREAM_API_KEY` in Vercel Project Settings → Environment Variables for Production, Preview and Development as needed.
3. Add the same `DOODSTREAM_API_KEY` to the upload worker environment. Keep the key private; never expose it in browser code.
4. Redeploy VIRALINDO and the upload worker after setting the key.
5. Upload videos to DoodStream, then open the VIRALINDO admin dashboard and run **Sinkronkan video DoodStream**. Files that DoodStream reports as playable are published; files still encoding remain in processing.
6. The admin dashboard refreshes catalog/status while it is open. The Vercel cron endpoint also performs scheduled synchronization; actual schedule frequency depends on the Vercel plan.

The admin dashboard supports automatic catalog import and status checks. The existing upload worker sends local video files to DoodStream; the remote-upload endpoint sends public HTTPS video URLs to DoodStream. Removing a video from VIRALINDO only removes its catalogue record, not the original file in DoodStream.

## Admin UI settings
The admin settings page controls brand name, tagline, homepage hero text, catalogue title, categories, footer text, and accent color. Settings are stored in Neon.

## Deploy
Configure the environment variables above in Vercel, then deploy the main branch. Run `db/migrations/003_doodstream_only.sql` once against the production Neon database. This sets DoodStream as the database default and hides any previously published non-DoodStream entries. Historical VidHold migration files are retained only as migration history; no active application route or playback code uses VidHold.

## Important
Only publish videos you own or are authorized to distribute. DoodStream playback and retention depend on the provider's account, processing state and current policies.
