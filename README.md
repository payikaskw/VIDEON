# VIDEON

Streaming catalogue for films, series and general video. Public viewers do not need accounts. Admin access is opened by tapping the VIDEON logo six times.

## Stack
- Next.js App Router + TypeScript
- Neon PostgreSQL
- DoodStream API
- Vercel deployment

## Local setup
1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill the secrets.
4. Run `db/schema.sql` in the Neon SQL Editor.
5. Generate an admin password hash: `node scripts/hash-password.mjs 'your-long-password'`.
6. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and a random `ADMIN_JWT_SECRET` (32+ chars).
7. Run `npm run dev`.

## DoodStream
Set `DOODSTREAM_API_KEY` in Vercel Environment Variables. The API key must never be exposed in browser code. Remote URL upload runs through the VIDEON backend. Local file uploads use the separate service in `worker/`; deploy it and set `VIDEO_WORKER_URL` and the same `UPLOAD_WORKER_SECRET` in Vercel and the worker. The worker streams the file to DoodStream without routing large files through Vercel.

Official docs: https://doodstream.com/api-docs

## Deploy
Import this repository into Vercel, add the environment variables, run the SQL schema in Neon, then deploy.

## Important
Only publish videos you own or are authorized to distribute. DoodStream embeds may include provider-controlled ads and playback behavior.
