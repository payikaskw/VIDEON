import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { vidholdFileList } from "@/lib/vidhold";

export const runtime = "nodejs";

async function synchronize() {
  const sql = getDb();
  let page = 1, imported = 0, updated = 0, scanned = 0, ready = 0;
  while (page <= 20) {
    const response = await vidholdFileList(page, 100);
    const files = Array.isArray(response.result?.files) ? response.result.files : [];
    if (!files.length) break;
    for (const file of files) {
      const code = String(file.file_code || file.filecode || "").trim();
      if (!/^[a-zA-Z0-9_-]{4,80}$/.test(code)) continue;
      scanned++;
      const title = String(file.title || file.file_title || ("Video " + code)).trim().slice(0, 180) || ("Video " + code);
      const thumb = typeof file.thumbnail === "string" ? file.thumbnail : (typeof file.player_img === "string" ? file.player_img : null);
      // VidHold documents the playable share page in the file-list link field.
      const link = typeof file.link === "string" && /^https?:\/\//i.test(file.link) ? file.link : null;
      const canPlay = [1, "1", true, "true"].includes(file.canplay as never);
      const status = canPlay ? "published" : "processing";
      if (canPlay) ready++;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150) + "-" + randomUUID().slice(0, 8);
      const rows = await sql`
        INSERT INTO videos(title,slug,provider,provider_file_code,source_url,embed_url,thumbnail_url,status,published_at)
        VALUES(${title},${slug},'vidhold',${code},${link},${link},${thumb},${status},CASE WHEN ${canPlay} THEN NOW() ELSE NULL END)
        ON CONFLICT(provider_file_code) WHERE provider_file_code IS NOT NULL
        DO UPDATE SET
          source_url=COALESCE(EXCLUDED.source_url,videos.source_url),
          embed_url=COALESCE(EXCLUDED.embed_url,videos.embed_url),
          thumbnail_url=COALESCE(EXCLUDED.thumbnail_url,videos.thumbnail_url),
          status=CASE WHEN ${canPlay} THEN 'published' ELSE videos.status END,
          published_at=CASE WHEN ${canPlay} THEN COALESCE(videos.published_at,NOW()) ELSE videos.published_at END,
          updated_at=NOW()
        RETURNING (xmax = 0) AS inserted
      `;
      if (rows[0]?.inserted) imported++; else updated++;
      await sql`
        INSERT INTO upload_jobs(provider,file_code,source_url,title,status,last_checked_at,updated_at)
        VALUES('vidhold',${code},${link},${title},${status},NOW(),NOW())
        ON CONFLICT(file_code) DO UPDATE SET
          source_url=COALESCE(EXCLUDED.source_url,upload_jobs.source_url),
          status=EXCLUDED.status,last_checked_at=NOW(),updated_at=NOW()
      `;
    }
    if (files.length < 100 || (response.result?.pages && page >= Number(response.result.pages))) break;
    page++;
  }
  return { scanned, imported, updated, ready, pages: page - 1 };
}

export async function POST() {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ ok: true, ...await synchronize() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Sinkronisasi VidHold gagal." }, { status: 502 }); }
}
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized cron" }, { status: 401 });
  try { return NextResponse.json({ ok: true, ...await synchronize() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Sinkronisasi VidHold gagal." }, { status: 502 }); }
}
