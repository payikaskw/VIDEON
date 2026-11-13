import Link from "next/link";
import { getDb } from "@/lib/db";
import { getDoodEmbed } from "@/lib/doodstream";
import VideoPlayer from "@/components/video-player";
export const dynamic = "force-dynamic";
export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return <main className="content" style={{minHeight:"100vh",paddingTop:32}}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video tidak ditemukan</h1><p className="muted">Alamat video tidak valid. Silakan pilih video dari halaman utama.</p></main>;
 let video:Record<string,any>|null=null;let playerUrl="";let loadError=false;
 try{
  const sql=getDb();const found=await sql`SELECT id,title,description,embed_url,thumbnail_url,year,type,provider,provider_file_code,status FROM videos WHERE id=${id} AND provider='doodstream' AND status='published' LIMIT 1`;video=found[0]||null;
  if(video?.provider_file_code){
   playerUrl=getDoodEmbed(String(video.provider_file_code));
   if(video.embed_url!==playerUrl)await sql`UPDATE videos SET embed_url=${playerUrl},updated_at=NOW() WHERE id=${id} AND provider='doodstream' AND status='published'`;
  }
 }catch(error){console.error("[watch]",error);loadError=true;}
 if(loadError)return <main className="content" style={{minHeight:"100vh",paddingTop:32}}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video belum dapat dimuat</h1><p className="muted">Koneksi database atau layanan pemutar sedang bermasalah. Silakan coba lagi.</p></main>;
 if(!video||!playerUrl)return <main className="content" style={{minHeight:"100vh",paddingTop:32}}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><h1>Video tidak ditemukan</h1><p className="muted">Video DoodStream ini belum dipublikasikan atau sudah tidak tersedia.</p></main>;
 return <main className="content" style={{minHeight:"100vh",paddingTop:24}}><Link href="/" className="muted">← Kembali ke VIRALINDO</Link><div style={{maxWidth:1100,margin:"24px auto"}}>
  <div style={{aspectRatio:"16/9",background:"#000",borderRadius:14,overflow:"hidden"}}><VideoPlayer url={playerUrl} title={video.title}/></div>
  <h1 style={{font:"800 clamp(24px,4vw,38px) Manrope",marginBottom:8}}>{video.title}</h1><p className="muted">{[video.year,video.type].filter(Boolean).join(" · ")}</p>{video.description&&<p style={{lineHeight:1.7,color:"#d4d4d8",maxWidth:800}}>{video.description}</p>}
 </div></main>;
}
