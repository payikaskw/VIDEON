import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
export const runtime="nodejs";
export async function GET(){
 try {const sql=getDb();const [settings,categories]=await Promise.all([
  sql`SELECT value FROM site_settings WHERE key='site_ui' LIMIT 1`,
  sql`SELECT name,slug FROM categories ORDER BY name`
 ]);return NextResponse.json({settings:settings[0]?.value||{},categories});}
 catch{return NextResponse.json({settings:{},categories:[]},{status:200});}
}
