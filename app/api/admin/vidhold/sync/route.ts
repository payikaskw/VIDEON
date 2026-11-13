import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { vidholdExtractPlaybackUrl, vidholdFileList } from "@/lib/vidhold";

export const runtime = "nodejs";

function providerReady(file: Record<string, unknown>) {
  const status = String(file.status ?? file.file_status ?? file.encoding_status ?? "").toLowerCase();
  return [1, "1", true, "true"].includes(file.canplay as never) ||
    [1, "1", true, "true"].includes(file.can_play as never) ||
    ["ready", "active", "complete", "completed", "ok", "success", "published"].includes(status);
}

async function synchronize() {
  const sql = getDb();
  let page = 1, imported = 0, updated = 0, scanned = 0, playable = 0, waitingForPlayer = 0;
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
      const playbackUrl = vidholdExtractPlaybackUrl(file);
      const ready = providerReady(file) && Boolean(playbackUrl);
      if (ready) playable++; else waitingForPlayer++;
      const status = ready ? "published" : "processing";
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150) + "-" + randomUUID().slice(0, 8);
      const rows = await sql`
        INSERT INTO videos(title,slug,provider,provider_file_code,source_url,embed_url,thumbnail_url,status,published_at)
        VALUES(${title},${slug},'vidhold',${code},NULL,${playbackUrl},${thumb},${status},CASE WHEN ${ready} THEN NOW() ELSE NULL END)
        ON CONFLICT(provider_file_code) WHERE provider_file_code IS NOT NULL
        DO UPDATE SET
          embed_url=COALESCE(EXCLUDED.embed_url,videos.embed_url),
          thumbnail_url=COALESCE(EXCLUDED.thumbnail_url,videos.thumbnail_url),
          status=CASE WHEN videos.status='hidden' THEN 'hidden' ELSE EXCLUDED.status END,
          published_at=CASE WHEN EXCLUDED.status='published' THEN COALESCE(videos.published_at,NOW()) ELSE NULL END,
          updated_at=NOW()
        RETURNING (xmax = 0) AS inserted
      `;
      if (rows[0]?.inserted) imported++; else updated++;
      await sql`
        INSERT INTO upload_jobs(provider,file_code,source_url,title,status,last_checked_at,updated_at)
        VALUES('vidhold',${code},NULL,${title},${status},NOW(),NOW())
        ON CONFLICT(file_code) DO UPDATE SET
          status=EXCLUDED.status,last_checked_at=NOW(),updated_at=NOW()
      `;
    }
    if (files.length < 100 || (response.result?.pages && page >= Number(response.result.pages))) break;
    page++;
  }
  return { scanned, imported, updated, playable, waitingForPlayer, pages: page - 1 };
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
