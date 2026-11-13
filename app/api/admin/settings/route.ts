import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
export const runtime="nodejs";
const schema=z.object({brandName:z.string().trim().min(1).max(60),tagline:z.string().max(160),heroEyebrow:z.string().max(100),heroTitle:z.string().max(160),heroDescription:z.string().max(500),sectionTitle:z.string().max(100),categories:z.array(z.string().trim().min(1).max(50)).max(30),footerText:z.string().max(160),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/)});
export async function GET(){
 if(!await getAdminSession()) return NextResponse.json({error:"Unauthorized"},{status:401});
 try {const sql=getDb();const rows=await sql`SELECT key,value FROM site_settings WHERE key IN ('site_ui')`;return NextResponse.json({settings:rows[0]?.value||{}});}
 catch{return NextResponse.json({error:"Gagal membaca pengaturan."},{status:500});}
}
export async function PUT(req:Request){
 if(!await getAdminSession()) return NextResponse.json({error:"Unauthorized"},{status:401});
 const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"Data pengaturan tidak valid."},{status:400});
 try {const sql=getDb();await sql`INSERT INTO site_settings(key,value,updated_at) VALUES('site_ui',${JSON.stringify(parsed.data)}::jsonb,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`;return NextResponse.json({ok:true,settings:parsed.data});}
 catch{return NextResponse.json({error:"Gagal menyimpan pengaturan."},{status:500});}
}
