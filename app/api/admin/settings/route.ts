import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  brandName: z.string().trim().min(1).max(60),
  tagline: z.string().max(160),
  heroEyebrow: z.string().max(100),
  heroTitle: z.string().max(160),
  heroDescription: z.string().max(500),
  sectionTitle: z.string().max(100),
  categories: z.array(z.string().trim().min(1).max(50)).max(30),
  footerText: z.string().max(160),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function GET() {
  if (!await getAdminSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sql = getDb();
    const rows = await sql`SELECT key, value FROM site_settings WHERE key = 'site_ui' LIMIT 1`;
    return NextResponse.json({ settings: rows[0]?.value || {} });
  } catch (error) {
    console.error("[admin/settings] Gagal membaca:", error);
    return NextResponse.json({ error: "Gagal membaca pengaturan." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!await getAdminSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format data pengaturan tidak valid." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: "Data pengaturan tidak valid.",
      detail: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    }, { status: 400 });
  }

  try {
    const sql = getDb();
    const data = parsed.data;

    // UI settings are stored as one JSON document. Do not couple this save
    // to the separate video-category catalog: category sync failures there
    // previously caused the entire settings form to report a false failure.
    const rows = await sql`
      INSERT INTO site_settings (key, value, updated_at)
      VALUES ('site_ui', ${JSON.stringify(data)}::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      RETURNING key
    `;

    if (!rows.length) {
      throw new Error("Database tidak mengonfirmasi penyimpanan pengaturan.");
    }

    return NextResponse.json({ ok: true, settings: data });
  } catch (error) {
    console.error("[admin/settings] Gagal menyimpan:", error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({
      error: "Gagal menyimpan pengaturan.",
      detail: process.env.NODE_ENV === "production" ? "Periksa log fungsi admin/settings di Vercel." : detail,
    }, { status: 500 });
  }
}
