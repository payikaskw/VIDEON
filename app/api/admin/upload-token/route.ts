import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
const schema=z.object({title:z.string().min(1).max(180)});
export async function POST(req:Request){
 if(!await getAdminSession())return NextResponse.json({error:"Unauthorized"},{status:401});
 const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"Judul video tidak valid."},{status:400});
 const secret=process.env.UPLOAD_WORKER_SECRET;const workerUrl=process.env.VIDEO_WORKER_URL;
 if(!secret||secret.length<32||!workerUrl)return NextResponse.json({error:"VIDEO_WORKER_URL dan UPLOAD_WORKER_SECRET belum dikonfigurasi."},{status:503});
 const token=await new SignJWT({title:parsed.data.title}).setProtectedHeader({alg:"HS256"}).setIssuer("videon").setAudience("videon-upload-worker").setSubject("upload").setJti(randomUUID()).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(secret));
 return NextResponse.json({token,uploadUrl:workerUrl.replace(/\/+$/,"")+"/upload"});
}
