import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
export const runtime="nodejs";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {
 if(!await getAdminSession()) return NextResponse.json({error:"Unauthorized"},{status:401});
 try {
  const {id}=await params; const body=await req.json(); const status=body.status;
  if(!["hidden","published"].includes(status)) return NextResponse.json({error:"Status tidak valid."},{status:400});
  const sql=getDb(); await sql`UPDATE videos SET status=${status},published_at=CASE WHEN ${status}='published' THEN COALESCE(published_at,NOW()) ELSE published_at END,updated_at=NOW() WHERE id=${id}`;
  return NextResponse.json({ok:true,status});
 } catch { return NextResponse.json({error:"Gagal mengubah visibilitas video."},{status:500}); }
}
export async function DELETE(_req:Request,{params}:{params:Promise<{id:string}>}) {
 if(!await getAdminSession()) return NextResponse.json({error:"Unauthorized"},{status:401});
 try { const {id}=await params; const sql=getDb(); await sql`DELETE FROM videos WHERE id=${id}`; return NextResponse.json({ok:true,scope:"website_only"}); }
 catch { return NextResponse.json({error:"Gagal menghapus video dari katalog VIDEON."},{status:500}); }
}
