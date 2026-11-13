import Link from "next/link";
import { Play,Film } from "lucide-react";
import { getDb } from "@/lib/db";
import { getDoodEmbed } from "@/lib/doodstream";
import VideoPlayer from "@/components/video-player";
export const dynamic = "force-dynamic";
type RelatedVideo={id:string;title:string;thumbnail_url:string|null;type:string|null;year:number|null};
export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return <main className="content" style={{minHeight:"100vh",paddingTop:32}}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video tidak ditemukan</h1><p className="muted">Alamat video tidak valid. Silakan pilih video dari halaman utama.</p></main>;
 let video:Record<string,any>|null=null;let playerUrl="";let loadError=false;let related:RelatedVideo[]=[];
 try{
  const sql=getDb();const found=await sql`SELECT id,title,description,embed_url,thumbnail_url,year,type,provider,provider_file_code,status FROM videos WHERE id=${id} AND provider='doodstream' AND status='published' LIMIT 1`;video=found[0]||null;
  if(video?.provider_file_code){
   playerUrl=getDoodEmbed(String(video.provider_file_code));
   if(video.embed_url!==playerUrl)await sql`UPDATE videos SET embed_url=${playerUrl},updated_at=NOW() WHERE id=${id} AND provider='doodstream' AND status='published'`;
   related=await sql`SELECT id,title,thumbnail_url,type,year FROM videos WHERE provider='doodstream' AND status='published' AND id<>${id} ORDER BY published_at DESC NULLS LAST,created_at DESC LIMIT 8`;
  }
 }catch(error){console.error("[watch]",error);loadError=true;}
 if(loadError)return <main className="content" style={{minHeight:"100vh",paddingTop:32}}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video belum dapat dimuat</h1><p className="muted">Koneksi database atau layanan pemutar sedang bermasalah. Silakan coba lagi.</p></main>;
 if(!video||!playerUrl)return <main className="content" style={{minHeight:"100vh",paddingTop:32}}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video tidak ditemukan</h1><p className="muted">Video DoodStream ini belum dipublikasikan atau sudah tidak tersedia.</p></main>;
 return <main className="watch-page"><header className="watch-header"><Link href="/" className="watch-brand"><span className="watch-brand-mark"><Play size={16} fill="white"/></span><span>VIRALINDO</span></Link><Link href="/" className="watch-home-link">← Kembali ke beranda</Link></header><div className="watch-content">
  <div className="watch-player"><VideoPlayer url={playerUrl} title={video.title}/></div>
  <h1 className="watch-title">{video.title}</h1><p className="muted">{[video.year,video.type].filter(Boolean).join(" · ")}</p>{video.description&&<p className="watch-description">{video.description}</p>}
  <section className="related-section"><div className="related-heading"><h2>Video terkait</h2><span className="muted">{related.length} video</span></div>{related.length===0?<p className="muted">Belum ada video terkait lainnya.</p>:<div className="related-grid">{related.map(v=><Link href={"/watch/"+v.id} className="related-card" key={v.id}><div className="related-poster">{v.thumbnail_url?<img src={v.thumbnail_url} alt={v.title}/>:<div className="poster-placeholder"><Film size={28}/></div>}</div><h3>{v.title}</h3><p>{[v.year,v.type].filter(Boolean).join(" · ")}</p></Link>)}</div>}</section>
 </div></main>;
}
