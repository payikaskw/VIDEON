import Link from "next/link";
import { getDb } from "@/lib/db";
export const dynamic = "force-dynamic";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return <main className="content" style={{ minHeight: "100vh", paddingTop: 32 }}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video tidak ditemukan</h1><p className="muted">Alamat video tidak valid. Silakan pilih video dari halaman utama.</p></main>;
  }

  let video: any = null;
  let loadError = false;
  try {
    const sql = getDb();
    const rows = await sql`SELECT id,title,description,embed_url,source_url,thumbnail_url,year,type,provider_file_code,status FROM videos WHERE id=${id} AND status='published' LIMIT 1`;
    video = rows[0] || null;
  } catch {
    loadError = true;
  }

  if (loadError) {
    return <main className="content" style={{ minHeight: "100vh", paddingTop: 32 }}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video belum dapat dimuat</h1><p className="muted">Koneksi database sedang bermasalah. Silakan coba lagi beberapa saat.</p></main>;
  }
  if (!video) {
    return <main className="content" style={{ minHeight: "100vh", paddingTop: 32 }}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video tidak ditemukan</h1><p className="muted">Video ini belum dipublikasikan atau sudah tidak tersedia.</p></main>;
  }

  const rawPlayerUrl = typeof video.embed_url === "string" && video.embed_url.trim() ? video.embed_url.trim() : (typeof video.source_url === "string" ? video.source_url.trim() : "");
  let playerUrl = "";
  try {
    const parsed = new URL(rawPlayerUrl);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") playerUrl = parsed.toString();
  } catch {
    playerUrl = "";
  }

  return (
    <main className="content" style={{ minHeight: "100vh", paddingTop: 24 }}>
      <Link href="/" className="muted">← Kembali ke VIRALINDO</Link>
      <div style={{ maxWidth: 1100, margin: "24px auto" }}>
        {playerUrl ? (
          <div style={{ aspectRatio: "16/9", background: "#000", borderRadius: 14, overflow: "hidden" }}>
            <iframe src={playerUrl} title={video.title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="origin" style={{ width: "100%", height: "100%", border: 0 }} />
          </div>
        ) : (
          <div style={{ aspectRatio: "16/9", background: "#111116", border: "1px solid #303038", borderRadius: 14, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
            <div><div style={{ fontSize: 42, marginBottom: 12 }}>▶</div><h2 style={{ margin: "0 0 8px" }}>Player sedang disiapkan</h2><p className="muted" style={{ maxWidth: 520, margin: "0 auto" }}>Video sudah terdaftar, tetapi VidHold belum memberikan alamat pemutar. Coba lagi setelah proses video selesai atau periksa status video dari Admin.</p></div>
          </div>
        )}
        <h1 style={{ font: "800 clamp(24px,4vw,38px) Manrope", marginBottom: 8 }}>{video.title}</h1>
        <p className="muted">{[video.year, video.type].filter(Boolean).join(" · ")}</p>
        {video.description && <p style={{ lineHeight: 1.7, color: "#d4d4d8", maxWidth: 800 }}>{video.description}</p>}
      </div>
    </main>
  );
}
