import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { vidholdFileInfo, validFileCode } from "@/lib/vidhold";

export const runtime = "nodejs";
const schema = z.object({ fileCode: z.string().min(4).max(80) });

export async function POST(req: Request) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "File code tidak valid." }, { status: 400 });
    const fileCode = validFileCode(parsed.data.fileCode);
    const response = await vidholdFileInfo(fileCode);
    const result = response.result || {};
    const rawStatus = String(result.status || result.file_status || "").toLowerCase();
    const ready = ["ready", "active", "complete", "completed", "ok", "success"].includes(rawStatus);
    const failed = ["failed", "error", "deleted"].includes(rawStatus);
    const status = ready ? "published" : failed ? "failed" : "processing";
    const embedUrl = typeof result.embed_url === "string" ? result.embed_url :
      typeof result.player_url === "string" ? result.player_url : null;
    const sql = getDb();
    await sql`
      UPDATE videos SET status=${status},
        embed_url=COALESCE(${embedUrl}, embed_url),
        published_at=CASE WHEN ${ready} THEN COALESCE(published_at,NOW()) ELSE published_at END,
        updated_at=NOW()
      WHERE provider='vidhold' AND provider_file_code=${fileCode}
    `;
    await sql`
      UPDATE upload_jobs SET status=${status}, last_checked_at=NOW(),
        raw_response=${JSON.stringify(response)}::jsonb, updated_at=NOW()
      WHERE provider='vidhold' AND file_code=${fileCode}
    `;
    return NextResponse.json({ ok: true, fileCode, status, providerStatus: rawStatus || "unknown", playerReady: Boolean(embedUrl) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memeriksa status Vidhold." }, { status: 502 });
  }
}
