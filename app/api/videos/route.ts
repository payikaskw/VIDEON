import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
export const runtime="nodejs";
export async function GET(){
 try{
  const sql=getDb();
  const [videos,categories]=await Promise.all([
   sql`SELECT v.id,v.title,v.description,v.thumbnail_url,v.year,v.type,c.name AS category_name FROM videos v LEFT JOIN categories c ON c.id=v.category_id WHERE v.provider='doodstream' AND v.status='published' ORDER BY v.published_at DESC NULLS LAST,v.created_at DESC LIMIT 100`,
   sql`SELECT DISTINCT COALESCE(NULLIF(BTRIM(c.name),''), INITCAP(v.type)) AS name FROM videos v LEFT JOIN categories c ON c.id=v.category_id WHERE v.provider='doodstream' AND v.status='published' AND (NULLIF(BTRIM(c.name),'') IS NOT NULL OR NULLIF(BTRIM(v.type),'') IS NOT NULL) ORDER BY name`
  ]);
  return NextResponse.json({videos,categories:categories.map((c:any)=>c.name).filter(Boolean)});
 }catch{return NextResponse.json({videos:[],categories:[]});}
}
