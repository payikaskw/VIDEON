import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
export const dynamic="force-dynamic";
export default async function WatchPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 let rows:any[]=[];try{const sql=getDb();rows=await sql`SELECT id,title,description,embed_url,thumbnail_url,year,type FROM videos WHERE id=${id} AND status='published' LIMIT 1`;}catch{notFound()}
 const video=rows[0];if(!video||!video.embed_url)notFound();
 return <main className="content" style={{minHeight:"100vh"}}><Link href="/" className="muted">← Kembali ke VIDEON</Link><div style={{maxWidth:1100,margin:"24px auto"}}><div style={{aspectRatio:"16/9",background:"#000",borderRadius:14,overflow:"hidden"}}><iframe src={video.embed_url} title={video.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="origin" style={{width:"100%",height:"100%",border:0}}/></div><h1 style={{font:"800 clamp(24px,4vw,38px) Manrope",marginBottom:8}}>{video.title}</h1><p className="muted">{[video.year,video.type].filter(Boolean).join(" · ")}</p>{video.description&&<p style={{lineHeight:1.7,color:"#d4d4d8",maxWidth:800}}>{video.description}</p>}</div></main>
}
