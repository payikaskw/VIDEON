import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { doodGet, getDoodEmbed } from "@/lib/doodstream";
import { getDb } from "@/lib/db";
export const runtime="nodejs";
const schema=z.object({fileCode:z.string().min(4).max(40)});
export async function POST(req:Request){
 if(!await getAdminSession())return NextResponse.json({error:"Unauthorized"},{status:401});
 try{
  const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"File code tidak valid."},{status:400});
  const fileCode=parsed.data.fileCode;
  const [check,info]=await Promise.all([doodGet("file/check",{file_code:fileCode}),doodGet("file/info",{file_code:fileCode})]);
  const providerStatus=String(check.result?.[0]?.status||"processing");
  const detail=Array.isArray(info.result)?info.result[0]:info.result;
  const canplay=detail?.canplay;
  const ready=providerStatus.toLowerCase()==="active"&&(canplay===undefined||canplay===1||canplay==="1"||canplay===true);
  const playerUrl=getDoodEmbed(fileCode);
  const thumbnail=typeof detail?.single_img==="string"?detail.single_img:(typeof detail?.splash_img==="string"?detail.splash_img:null);
  const status=ready?"published":"processing";
  const sql=getDb();
  await sql`UPDATE videos SET status=CASE WHEN status='hidden' THEN 'hidden' ELSE ${status} END,embed_url=${playerUrl},thumbnail_url=COALESCE(${thumbnail},thumbnail_url),published_at=CASE WHEN ${ready} THEN COALESCE(published_at,NOW()) ELSE NULL END,updated_at=NOW() WHERE provider='doodstream' AND provider_file_code=${fileCode}`;
  await sql`UPDATE upload_jobs SET status=${status},last_checked_at=NOW(),raw_response=${JSON.stringify({check,info})}::jsonb,updated_at=NOW() WHERE provider='doodstream' AND file_code=${fileCode}`;
  return NextResponse.json({ok:true,fileCode,status,providerStatus,playerReady:ready,embedUrl:playerUrl});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal memeriksa status DoodStream."},{status:502})}
}
