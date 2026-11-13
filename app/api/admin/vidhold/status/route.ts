import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { validFileCode, vidholdResolvePlayback } from "@/lib/vidhold";

export const runtime = "nodejs";
const schema = z.object({ fileCode: z.string().min(4).max(80) });

export async function POST(req: Request) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "File code tidak valid." }, { status: 400 });
    const fileCode = validFileCode(parsed.data.fileCode);
    const resolved = await vidholdResolvePlayback(fileCode);
    const playerUrl = resolved.url;
    const providerStatus = resolved.providerStatus.toLowerCase();
    const failed = ["failed", "error", "deleted", "removed"].includes(providerStatus);
    const status = failed ? "failed" : playerUrl ? "published" : "processing";
    const sql = getDb();

    await sql`
      UPDATE videos SET
        status=CASE WHEN status='hidden' THEN 'hidden' ELSE ${status} END,
        embed_url=${playerUrl},
        published_at=CASE WHEN ${status}='published' THEN COALESCE(published_at,NOW()) ELSE NULL END,
        updated_at=NOW()
      WHERE provider='vidhold' AND provider_file_code=${fileCode}
    `;
    await sql`
      UPDATE upload_jobs SET status=${status}, last_checked_at=NOW(),
        raw_response=${JSON.stringify({
          providerStatus: resolved.providerStatus,
          infoFields: resolved.infoFields,
          directLinkFields: resolved.directLinkFields,
          directLinkError: resolved.directLinkError,
          playbackType: resolved.type,
          playerReady: Boolean(playerUrl),
        })}::jsonb,
        updated_at=NOW()
      WHERE provider='vidhold' AND file_code=${fileCode}
    `;

    return NextResponse.json({
      ok: true, fileCode, status, providerStatus: resolved.providerStatus,
      providerReady: ["ready", "active", "complete", "completed", "ok", "success", "published", "1", "true"].includes(providerStatus),
      playerReady: Boolean(playerUrl), playbackType: resolved.type,
      infoFields: resolved.infoFields, directLinkFields: resolved.directLinkFields,
      directLinkError: resolved.directLinkError,
      message: playerUrl
        ? "Alamat pemutar berhasil ditemukan dan disimpan."
        : "VidHold belum mengembalikan embed/player URL atau direct stream. Video ditahan dalam status processing agar tidak tampil sebagai video siap putar.",
    });
  } catch (error) {
    console.error("[vidhold/status]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memeriksa status VidHold." }, { status: 502 });
  }
}
