# VIDEON DoodStream Upload Worker

Deploy this folder as a separate Node service (Render, Railway, Fly.io, or a VPS). It streams local file uploads to DoodStream without exposing the DoodStream API key to the browser or sending the file through Vercel.

## Environment
- `DOODSTREAM_API_KEY`: same private DoodStream API key as the main app
- `UPLOAD_WORKER_SECRET`: same random secret configured in Vercel
- `APP_ORIGIN`: exact public VIDEON origin, e.g. https://videon.example.com
- `MAX_UPLOAD_BYTES`: optional maximum file size in bytes (default 5 GiB)

## Deploy
Set the worker root directory to `worker`, use Dockerfile deployment, and expose port 8080. Verify `/health` returns `{"ok":true}`.

## Flow
1. Authenticated VIDEON admin requests a short-lived signed upload token from Vercel.
2. Browser uploads directly to this worker.
3. Worker streams the file to the DoodStream upload server with the API key kept server-side.
4. Browser submits the returned file code to the authenticated Vercel completion endpoint.
