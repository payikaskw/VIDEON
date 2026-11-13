import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { doodGet } from "@/lib/doodstream";
import { getDb } from "@/lib/db";
export const runtime="nodejs";
const schema=z.object({fileCode:z.string().min(4).max(40)});
export async function POST(req:Request){
 if(!await getAdminSession())return NextResponse.json({error:"Unauthorized"},{status:401});
 try{
  const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"File code tidak valid."},{status:400});
  const {fileCode}=parsed.data;const check=await doodGet("file/check",{file_code:fileCode});const status=String(check.result?.[0]?.status||"processing");
  if(status.toLowerCase()==="active"){
   const sql=getDb();
   await sql`UPDATE videos SET status='published',published_at=COALESCE(published_at,NOW()),updated_at=NOW() WHERE provider_file_code=${fileCode}`;
   await sql`UPDATE upload_jobs SET status='completed',last_checked_at=NOW(),raw_response=${JSON.stringify(check)}::jsonb,updated_at=NOW() WHERE file_code=${fileCode}`;
  }else{
   const sql=getDb();await sql`UPDATE upload_jobs SET status='processing',last_checked_at=NOW(),raw_response=${JSON.stringify(check)}::jsonb,updated_at=NOW() WHERE file_code=${fileCode}`;
  }
  return NextResponse.json({fileCode,status:status.toLowerCase()==="active"?"published":"processing",providerStatus:status});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal memeriksa status."},{status:502})}
}
