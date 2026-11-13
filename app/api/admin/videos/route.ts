import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
export const runtime="nodejs";
export async function GET(){if(!await getAdminSession())return NextResponse.json({error:"Unauthorized"},{status:401});try{const sql=getDb();const videos=await sql`SELECT id,title,status,type,provider_file_code,created_at FROM videos ORDER BY created_at DESC LIMIT 200`;return NextResponse.json({videos})}catch{return NextResponse.json({error:"Database belum siap. Jalankan db/schema.sql di Neon."},{status:503})}}
