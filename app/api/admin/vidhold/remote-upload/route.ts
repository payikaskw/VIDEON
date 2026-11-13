import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { validatePublicVideoUrl, vidholdRemoteImport, validFileCode } from "@/lib/vidhold";

export const runtime = "nodejs";
const schema = z.object({
  url: z.string().url().max(2048),
  title: z.string().trim().min(1).max(180),
  description: z.string().max(5000).optional(),
  type: z.enum(["film", "serial", "anime", "documenter", "hiburan", "video"]).default("video"),
  thumbnailUrl: z.string().url().max(2048).optional(),
});

export async function POST(req: Request) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Data video tidak valid.", details: parsed.error.flatten() }, { status: 400 });
    const sourceUrl = validatePublicVideoUrl(parsed.data.url);
    const result = await vidholdRemoteImport(sourceUrl);
    const fileCode = validFileCode(String(result.result?.filecode || ""));
    const sql = getDb();
    const slug = parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160) + "-" + randomUUID().slice(0, 8);
    const rows = await sql`
      INSERT INTO videos (title, slug, description, type, provider, provider_file_code, source_url, thumbnail_url, status)
      VALUES (${parsed.data.title}, ${slug}, ${parsed.data.description || null}, ${parsed.data.type}, 'vidhold', ${fileCode}, ${sourceUrl}, ${parsed.data.thumbnailUrl || null}, 'processing')
      RETURNING id
    `;
    await sql`
      INSERT INTO upload_jobs (provider, file_code, source_url, title, status)
      VALUES ('vidhold', ${fileCode}, ${sourceUrl}, ${parsed.data.title}, 'processing')
      ON CONFLICT (file_code) DO UPDATE SET status='processing', updated_at=NOW()
    `;
    return NextResponse.json({ ok: true, id: rows[0]?.id, fileCode, status: "processing", message: "Vidhold menerima URL. Import dan encoding berjalan di background." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal mengirim URL ke Vidhold." }, { status: 502 });
  }
}
