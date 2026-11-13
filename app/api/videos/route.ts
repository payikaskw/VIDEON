import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
export const runtime="nodejs";
export async function GET(){
 try{
  const sql=getDb();
  const videos=await sql`SELECT v.id,v.title,v.description,v.thumbnail_url,v.year,v.type,c.name AS category_name FROM videos v LEFT JOIN categories c ON c.id=v.category_id WHERE v.status='published' ORDER BY v.published_at DESC NULLS LAST,v.created_at DESC LIMIT 100`;
  return NextResponse.json({videos});
 }catch{return NextResponse.json({videos:[]});}
}
