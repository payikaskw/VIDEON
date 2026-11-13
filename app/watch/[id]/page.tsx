import Link from "next/link";
import { getDb } from "@/lib/db";
import { vidholdDirectLink, vidholdFileInfo, vidholdFileList } from "@/lib/vidhold";
export const dynamic = "force-dynamic";

type Rec = Record<string, unknown>;
function rec(v: unknown): Rec { return v && typeof v === "object" && !Array.isArray(v) ? v as Rec : {}; }
function text(...values: unknown[]): string | null {
  for (const v of values) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}
function firstSafeUrl(...values: unknown[]): string {
  for (const value of values) {
    const candidate = safeUrl(value);
    if (candidate) return candidate;
  }
  return "";
}
function rows(v: unknown): Rec[] {
  if (Array.isArray(v)) return v.map(rec);
  const o = rec(v);
  for (const k of ["files", "results", "data", "items"]) if (Array.isArray(o[k])) return (o[k] as unknown[]).map(rec);
  return Object.keys(o).length ? [o] : [];
}
function safeUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    // VidHold legacy API returns HTTP CDN/share URLs; upgrade them to HTTPS to avoid
    // browsers blocking playback as mixed content on the HTTPS VIRALINDO site.
    u.protocol = "https:";
    return u.toString();
  } catch { return ""; }
}
function fileUrl(file: Rec): string {
  const direct = firstSafeUrl(file.embed_url, file.embed, file.player_url, file.player, file.link, file.file_url, file.view_url, file.url);
  if (direct) return direct;
  for (const key of ["result", "data", "file", "info"]) {
    const nested = rec(file[key]);
    const found = firstSafeUrl(nested.embed_url, nested.embed, nested.player_url, nested.player, nested.link, nested.file_url, nested.view_url, nested.url);
    if (found) return found;
  }
  return "";
}
async function resolveVidHoldPlayback(fileCode: string): Promise<string> {
  let info: Rec = {};
  try {
    const result = await vidholdFileInfo(fileCode);
    info = rows(result.result).find(x => text(x.file_code, x.filecode, x.file_code_id) === fileCode) || rows(result.result)[0] || {};
  } catch {}
  try {
    const direct = rec((await vidholdDirectLink(fileCode)).result);
    const versions = Array.isArray(direct.versions) ? direct.versions.map(rec) : [];
    const mp4 = versions.find(v => ["h", "n", "l", "o"].includes(String(v.name || "")) && safeUrl(v.url));
    if (mp4) return safeUrl(mp4.url);
    const hls = safeUrl(direct.hls_direct);
    if (hls) return hls;
  } catch {}
  const fromInfo = fileUrl(info);
  if (fromInfo) return fromInfo;
  try {
    const listing = await vidholdFileList(1, 100);
    const listed = rows(listing.result).find(x => text(x.file_code, x.filecode, x.file_code_id, x.code) === fileCode);
    if (listed) return fileUrl(listed);
  } catch {}
  return "";
}

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return <main className="content" style={{ minHeight: "100vh", paddingTop: 32 }}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video tidak ditemukan</h1><p className="muted">Alamat video tidak valid. Silakan pilih video dari halaman utama.</p></main>;
  }

  let video: any = null;
  let loadError = false;
  try {
    const sql = getDb();
    const found = await sql`SELECT id,title,description,embed_url,source_url,thumbnail_url,year,type,provider,provider_file_code,status FROM videos WHERE id=${id} AND status='published' LIMIT 1`;
    video = found[0] || null;
    if (video && video.provider === "vidhold" && !firstSafeUrl(video.embed_url, video.source_url) && video.provider_file_code) {
      const resolved = await resolveVidHoldPlayback(String(video.provider_file_code));
      if (resolved) {
        video.embed_url = resolved;
        await sql`UPDATE videos SET embed_url=${resolved},updated_at=NOW() WHERE id=${id}`;
      }
    }
  } catch {
    loadError = true;
  }

  if (loadError) {
    return <main className="content" style={{ minHeight: "100vh", paddingTop: 32 }}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video belum dapat dimuat</h1><p className="muted">Koneksi database sedang bermasalah. Silakan coba lagi beberapa saat.</p></main>;
  }
  if (!video) {
    return <main className="content" style={{ minHeight: "100vh", paddingTop: 32 }}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video tidak ditemukan</h1><p className="muted">Video ini belum dipublikasikan atau sudah tidak tersedia.</p></main>;
  }

  const playerUrl = firstSafeUrl(video.embed_url, video.source_url);
  const isMediaFile = /\.(mp4|webm|ogg)(\?|$)/i.test(playerUrl);
  const isHls = /\.m3u8(\?|$)/i.test(playerUrl);

  return (
    <main className="content" style={{ minHeight: "100vh", paddingTop: 24 }}>
      <Link href="/" className="muted">← Kembali ke VIRALINDO</Link>
      <div style={{ maxWidth: 1100, margin: "24px auto" }}>
        {playerUrl ? (
          <div style={{ aspectRatio: "16/9", background: "#000", borderRadius: 14, overflow: "hidden" }}>
            {isMediaFile || isHls ? <video src={playerUrl} controls playsInline preload="metadata" poster={video.thumbnail_url || undefined} style={{ width: "100%", height: "100%" }} /> : <iframe src={playerUrl} title={video.title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="origin" style={{ width: "100%", height: "100%", border: 0 }} />}
          </div>
        ) : (
          <div style={{ aspectRatio: "16/9", background: "#111116", border: "1px solid #303038", borderRadius: 14, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
            <div><div style={{ fontSize: 42, marginBottom: 12 }}>▶</div><h2 style={{ margin: "0 0 8px" }}>Alamat pemutar belum tersedia</h2><p className="muted" style={{ maxWidth: 520, margin: "0 auto" }}>VIRALINDO sudah mencoba mengambil ulang alamat pemutar langsung dari VidHold. Jika tetap kosong, akun/API VidHold belum menyediakan link streaming untuk file ini.</p></div>
          </div>
        )}
        <h1 style={{ font: "800 clamp(24px,4vw,38px) Manrope", marginBottom: 8 }}>{video.title}</h1>
        <p className="muted">{[video.year, video.type].filter(Boolean).join(" · ")}</p>
        {video.description && <p style={{ lineHeight: 1.7, color: "#d4d4d8", maxWidth: 800 }}>{video.description}</p>}
      </div>
    </main>
  );
}
