import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { doodGet, getDoodEmbed } from "@/lib/doodstream";
import { getDb } from "@/lib/db";
export const runtime="nodejs";
const schema=z.object({url:z.string().url().max(2048),title:z.string().min(1).max(180)});
export async function POST(req:Request){
 if(!await getAdminSession())return NextResponse.json({error:"Unauthorized"},{status:401});
 try{
  const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"URL atau judul tidak valid."},{status:400});
  const source=new URL(parsed.data.url);
  if(source.protocol!=="https:"||!source.hostname||source.hostname==="localhost"||source.hostname.endsWith(".local")||/^127\.|^10\.|^192\.168\.|^169\.254\./.test(source.hostname))return NextResponse.json({error:"Gunakan direct video URL HTTPS publik."},{status:400});
  const data=await doodGet("upload/url",{url:parsed.data.url,new_title:parsed.data.title});
  const fileCode=data.result?.filecode;if(!fileCode)throw new Error("DoodStream tidak mengembalikan filecode.");
  const sql=getDb();const slug=parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,160)+"-"+randomUUID().slice(0,8);
  const embedUrl=getDoodEmbed(fileCode);
  await sql`INSERT INTO videos (title,slug,provider,provider_file_code,embed_url,source_url,status,type) VALUES (${parsed.data.title},${slug},'doodstream',${fileCode},${embedUrl},${parsed.data.url},'processing','video') ON CONFLICT (slug) DO NOTHING`;
  await sql`INSERT INTO upload_jobs (provider,file_code,source_url,title,status) VALUES ('doodstream',${fileCode},${parsed.data.url},${parsed.data.title},'queued') ON CONFLICT (file_code) DO NOTHING`;
  return NextResponse.json({ok:true,fileCode,status:"queued",message:"Remote upload masuk antrean. Setelah DoodStream mengaktifkan file, admin dapat memperbarui status agar video dipublikasikan."});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Remote upload gagal."},{status:502});}
}
