import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { vidholdFileInfo, vidholdFileList, validFileCode } from "@/lib/vidhold";

export const runtime = "nodejs";
const schema = z.object({ fileCode: z.string().min(4).max(80) });

function firstRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return (value[0] && typeof value[0] === "object" ? value[0] : {}) as Record<string, unknown>;
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(req: Request) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "File code tidak valid." }, { status: 400 });
    const fileCode = validFileCode(parsed.data.fileCode);
    const response = await vidholdFileInfo(fileCode);
    let file = firstRecord(response.result);
    // VidHold's file-info endpoint may return an array, while file-list includes
    // the actual share/player link and canplay flag.
    if (!textValue(file.embed_url) && !textValue(file.player_url) && !textValue(file.link)) {
      const listing = await vidholdFileList(1, 100);
      const files = Array.isArray(listing.result?.files) ? listing.result.files : [];
      const listed = files.find((item) => String(item.file_code || item.filecode || "") === fileCode);
      if (listed) file = { ...listed, ...file };
    }
    const rawStatus = String(file.status || file.file_status || "").toLowerCase();
    const canPlay = [1, "1", true, "true"].includes(file.canplay as never);
    const ready = canPlay || ["ready", "active", "complete", "completed", "ok", "success"].includes(rawStatus);
    const failed = ["failed", "error", "deleted"].includes(rawStatus);
    const status = ready ? "published" : failed ? "failed" : "processing";
    const embedUrl = textValue(file.embed_url) || textValue(file.player_url) ||
      textValue(file.link) || textValue(file.file_url);
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
        raw_response=${JSON.stringify({ fileInfo: response, fileListRecord: file })}::jsonb, updated_at=NOW()
      WHERE provider='vidhold' AND file_code=${fileCode}
    `;
    return NextResponse.json({ ok: true, fileCode, status, providerStatus: rawStatus || "unknown", playerReady: Boolean(embedUrl) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memeriksa status Vidhold." }, { status: 502 });
  }
}
