import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { vidholdFileInfo, vidholdFileList, validFileCode } from "@/lib/vidhold";

export const runtime = "nodejs";
const schema = z.object({ fileCode: z.string().min(4).max(80) });

type RecordValue = Record<string, unknown>;
function asRecord(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}
function recordsFrom(value: unknown): RecordValue[] {
  if (Array.isArray(value)) return value.map(asRecord).filter(x => Object.keys(x).length > 0);
  const obj = asRecord(value);
  for (const key of ["files", "results", "data", "items"]) {
    if (Array.isArray(obj[key])) return (obj[key] as unknown[]).map(asRecord);
  }
  return Object.keys(obj).length ? [obj] : [];
}
function str(...values: unknown[]): string | null {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}
function safePlayerUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.protocol = "https:";
    return url.toString();
  } catch { return null; }
}
function firstPlayerUrl(...values: unknown[]): string | null {
  for (const value of values) {
    const url = safePlayerUrl(value);
    if (url) return url;
  }
  return null;
}
function getUrl(file: RecordValue): string | null {
  const direct = firstPlayerUrl(file.embed_url, file.embed, file.player_url, file.player, file.link, file.file_url, file.view_url, file.url, file.download_url);
  if (direct) return direct;
  for (const key of ["result", "data", "file", "info"]) {
    const nested = asRecord(file[key]);
    const found = firstPlayerUrl(nested.embed_url, nested.embed, nested.player_url, nested.player, nested.link, nested.file_url, nested.view_url, nested.url, nested.download_url);
    if (found) return found;
  }
  return null;
}
function statusOf(file: RecordValue): string {
  const value = file.status ?? file.file_status ?? file.encoding_status ?? file.convert_status ?? file.state;
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value.toLowerCase().trim() : "";
}

export async function POST(req: Request) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "File code tidak valid." }, { status: 400 });
    const fileCode = validFileCode(parsed.data.fileCode);
    const infoResponse = await vidholdFileInfo(fileCode);
    const infoCandidates = recordsFrom(infoResponse.result);
    let file = infoCandidates.find(x => str(x.file_code, x.filecode, x.file_code_id) === fileCode) || infoCandidates[0] || {};

    let listMatched = false;
    if (!getUrl(file) || !statusOf(file)) {
      const listing = await vidholdFileList(1, 100);
      const listCandidates = recordsFrom(listing.result);
      const listed = listCandidates.find(x => str(x.file_code, x.filecode, x.file_code_id, x.code) === fileCode);
      if (listed) {
        file = { ...listed, ...file };
        listMatched = true;
      }
    }

    const rawStatus = statusOf(file);
    const canPlay = [1, "1", true, "true"].includes(file.canplay as never) ||
      [1, "1", true, "true"].includes(file.can_play as never);
    const ready = canPlay || ["ready", "active", "complete", "completed", "ok", "success", "published"].includes(rawStatus);
    const failed = ["failed", "error", "deleted", "removed"].includes(rawStatus);
    const status = ready ? "published" : failed ? "failed" : "processing";
    const playerUrl = getUrl(file);
    const sql = getDb();

    await sql`
      UPDATE videos SET
        status=${status},
        embed_url=COALESCE(${playerUrl}, embed_url, source_url),
        published_at=CASE WHEN ${ready} THEN COALESCE(published_at,NOW()) ELSE published_at END,
        updated_at=NOW()
      WHERE provider='vidhold' AND provider_file_code=${fileCode}
    `;
    await sql`
      UPDATE upload_jobs SET status=${status}, last_checked_at=NOW(),
        raw_response=${JSON.stringify({ info: infoResponse.result, matchedInList: listMatched, playerUrlFound: Boolean(playerUrl), providerStatus: rawStatus })}::jsonb,
        updated_at=NOW()
      WHERE provider='vidhold' AND file_code=${fileCode}
    `;

    return NextResponse.json({
      ok: true, fileCode, status, providerStatus: rawStatus || "unknown",
      playerReady: Boolean(playerUrl), directLinkFound: false, playbackType: playerUrl ? (/\\.(mp4|webm|ogg)(\\?|$)/i.test(playerUrl) ? "mp4" : "embed-or-download") : "unavailable", foundInFileList: listMatched,
      infoFields: Object.keys(file).slice(0, 30),
      directLinkFields: [],
      directLinkError: null,
      hasHls: /\\.m3u8(\\?|$)/i.test(playerUrl || ""),
      versionCount: 0,
      message: playerUrl ? "Alamat pemutar ditemukan dari file/info atau file/list." : "VidHold mengembalikan field file tetapi tidak memberikan URL HTTP/HTTPS yang bisa dipakai. Periksa nilai embed_url dan download_url pada akun VidHold."
    });
  } catch (error) {
    console.error("[vidhold/status]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memeriksa status VidHold." }, { status: 502 });
  }
}
