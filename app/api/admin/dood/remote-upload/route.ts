import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { doodGet } from "@/lib/doodstream";
import { getDb } from "@/lib/db";
export const runtime="nodejs";
const schema=z.object({url:z.string().url().max(2048),title:z.string().min(1).max(180)});
export async function POST(req:Request){
 if(!await getAdminSession())return NextResponse.json({error:"Unauthorized"},{status:401});
 try{
  const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"URL atau judul tidak valid."},{status:400});
  const source=new URL(parsed.data.url);if(source.protocol!=="https:")return NextResponse.json({error:"URL sumber harus menggunakan HTTPS."},{status:400});
  const data=await doodGet("upload/url",{url:parsed.data.url,new_title:parsed.data.title});
  const fileCode=data.result?.filecode;if(!fileCode)throw new Error("DoodStream tidak mengembalikan filecode.");
  const sql=getDb();
  await sql`INSERT INTO upload_jobs (provider,file_code,source_url,title,status) VALUES ('doodstream',${fileCode},${parsed.data.url},${parsed.data.title},'queued') ON CONFLICT (file_code) DO NOTHING`;
  return NextResponse.json({ok:true,fileCode,status:"queued",message:"Remote upload masuk antrean DoodStream."});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Remote upload gagal."},{status:502});}
}
