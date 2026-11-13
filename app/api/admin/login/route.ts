import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createAdminSession } from "@/lib/auth";

const schema=z.object({username:z.string().min(1).max(80),password:z.string().min(1).max(200)});
export async function POST(req:Request){
 try{
  const parsed=schema.safeParse(await req.json()); if(!parsed.success)return NextResponse.json({error:"Data login tidak valid."},{status:400});
  const {username,password}=parsed.data; const expectedUser=process.env.ADMIN_USERNAME; const hash=process.env.ADMIN_PASSWORD_HASH;
  if(!expectedUser||!hash||username!==expectedUser||!(await bcrypt.compare(password,hash)))return NextResponse.json({error:"Username atau password salah."},{status:401});
  await createAdminSession(username); return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Konfigurasi login admin belum lengkap."},{status:500});}
}
