import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { getDoodEmbed } from "@/lib/doodstream";
import { getDb } from "@/lib/db";
export const runtime="nodejs";
const schema=z.object({title:z.string().min(1).max(180),fileCode:z.string().min(4).max(40),thumbnailUrl:z.string().url().optional(),canplay:z.boolean().optional()});
export async function POST(req:Request){
 if(!await getAdminSession())return NextResponse.json({error:"Unauthorized"},{status:401});
 try{
  const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"Data upload tidak valid."},{status:400});
  const {title,fileCode,thumbnailUrl,canplay}=parsed.data;const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,160)+"-"+randomUUID().slice(0,8);
  const status=canplay?"published":"processing";const embedUrl=getDoodEmbed(fileCode);const sql=getDb();
  await sql`INSERT INTO videos(title,slug,provider,provider_file_code,embed_url,thumbnail_url,status,type,published_at) VALUES(${title},${slug},'doodstream',${fileCode},${embedUrl},${thumbnailUrl||null},${status},'video',CASE WHEN ${canplay||false} THEN NOW() ELSE NULL END)`;
  await sql`INSERT INTO upload_jobs(provider,file_code,title,status) VALUES('doodstream',${fileCode},${title},${status}) ON CONFLICT(file_code) DO NOTHING`;
  return NextResponse.json({ok:true,status});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal menyimpan video."},{status:500})}
}
