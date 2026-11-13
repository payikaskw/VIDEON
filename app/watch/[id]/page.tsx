import Link from "next/link";
import { getDb } from "@/lib/db";
import { vidholdPlaybackType, vidholdResolvePlayback } from "@/lib/vidhold";
import VideoPlayer from "@/components/video-player";
export const dynamic = "force-dynamic";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return <main className="content" style={{ minHeight: "100vh", paddingTop: 32 }}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video tidak ditemukan</h1><p className="muted">Alamat video tidak valid. Silakan pilih video dari halaman utama.</p></main>;
  }

  let video: Record<string, any> | null = null;
  let playerUrl = "";
  let loadError = false;
  try {
    const sql = getDb();
    const found = await sql`SELECT id,title,description,embed_url,source_url,thumbnail_url,year,type,provider,provider_file_code,status FROM videos WHERE id=${id} AND status='published' LIMIT 1`;
    video = found[0] || null;
    if (video?.provider === "vidhold" && video.provider_file_code) {
      // Refresh signed playback URLs on each watch request. Never mistake the
      // original import/source URL for a playable stream or embed.
      const resolved = await vidholdResolvePlayback(String(video.provider_file_code));
      const storedUrl = typeof video.embed_url === "string" && video.embed_url !== video.source_url ? video.embed_url : "";
      playerUrl = resolved.url || storedUrl;
      if (playerUrl) {
        video.embed_url = playerUrl;
        await sql`UPDATE videos SET embed_url=${playerUrl},updated_at=NOW() WHERE id=${id} AND status='published'`;
      } else {
        video.embed_url = null;
        await sql`UPDATE videos SET status='processing',embed_url=NULL,published_at=NULL,updated_at=NOW() WHERE id=${id} AND status='published'`;
      }
    } else {
      playerUrl = typeof video?.embed_url === "string" ? video.embed_url : "";
    }
  } catch (error) {
    console.error("[watch]", error);
    loadError = true;
  }

  if (loadError) return <main className="content" style={{ minHeight: "100vh", paddingTop: 32 }}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video belum dapat dimuat</h1><p className="muted">Koneksi database atau layanan pemutar sedang bermasalah. Silakan coba lagi.</p></main>;
  if (!video) return <main className="content" style={{ minHeight: "100vh", paddingTop: 32 }}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video tidak ditemukan</h1><p className="muted">Video ini belum dipublikasikan atau sudah tidak tersedia.</p></main>;

  const playbackType = vidholdPlaybackType(playerUrl);
  return (
    <main className="content" style={{ minHeight: "100vh", paddingTop: 24 }}>
      <Link href="/" className="muted">← Kembali ke VIRALINDO</Link>
      <div style={{ maxWidth: 1100, margin: "24px auto" }}>
        {playerUrl ? (
          <div style={{ aspectRatio: "16/9", background: "#000", borderRadius: 14, overflow: "hidden" }}>
            <VideoPlayer url={playerUrl} title={video.title} poster={video.thumbnail_url} type={playbackType === "unavailable" ? "embed" : playbackType} />
          </div>
        ) : (
          <div style={{ aspectRatio: "16/9", background: "#111116", border: "1px solid #303038", borderRadius: 14, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
            <div><div style={{ fontSize: 42, marginBottom: 12 }}>▶</div><h2 style={{ margin: "0 0 8px" }}>Alamat pemutar belum tersedia</h2><p className="muted" style={{ maxWidth: 520, margin: "0 auto" }}>VidHold belum mengembalikan alamat embed atau stream untuk video ini. Video tidak akan dipaksa diputar menggunakan URL sumber upload yang bukan alamat pemutar.</p></div>
          </div>
        )}
        <h1 style={{ font: "800 clamp(24px,4vw,38px) Manrope", marginBottom: 8 }}>{video.title}</h1>
        <p className="muted">{[video.year, video.type].filter(Boolean).join(" · ")}</p>
        {video.description && <p style={{ lineHeight: 1.7, color: "#d4d4d8", maxWidth: 800 }}>{video.description}</p>}
      </div>
    </main>
  );
}
