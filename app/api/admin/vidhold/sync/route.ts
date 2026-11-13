import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { vidholdFileList } from "@/lib/vidhold";
export const runtime="nodejs";
async function synchronize(){
 const sql=getDb();let page=1,imported=0,scanned=0;
 while(page<=20){const response=await vidholdFileList(page,100);const files=Array.isArray(response.result?.files)?response.result.files:[];if(!files.length)break;
  for(const f of files){const code=String(f.file_code||f.filecode||"").trim();if(!/^[a-zA-Z0-9_-]{4,80}$/.test(code))continue;scanned++;const title=String(f.title||f.file_title||("Video "+code)).trim().slice(0,180)||("Video "+code);const thumb=typeof f.thumbnail==="string"?f.thumbnail:(typeof f.player_img==="string"?f.player_img:null);const link=typeof f.link==="string"?f.link:null;const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,150)+"-"+randomUUID().slice(0,8);
   const rows=await sql`INSERT INTO videos(title,slug,provider,provider_file_code,source_url,thumbnail_url,status) VALUES(${title},${slug},'vidhold',${code},${link},${thumb},'processing') ON CONFLICT(provider_file_code) WHERE provider_file_code IS NOT NULL DO NOTHING RETURNING id`;
   if(rows.length){imported++;await sql`INSERT INTO upload_jobs(provider,file_code,source_url,title,status) VALUES('vidhold',${code},${link},${title},'processing') ON CONFLICT(file_code) DO NOTHING`;}
  }
  if(files.length<100||(response.result?.pages&&page>=Number(response.result.pages)))break;page++;
 }
 return {scanned,imported,pages:page-1};
}
export async function POST(){if(!await getAdminSession())return NextResponse.json({error:"Unauthorized"},{status:401});try{return NextResponse.json({ok:true,...await synchronize()})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Sync gagal"},{status:502})}}
export async function GET(req:Request){const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized cron"},{status:401});try{return NextResponse.json({ok:true,...await synchronize()})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Sync gagal"},{status:502})}}
