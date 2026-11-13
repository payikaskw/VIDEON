import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { doodGet } from "@/lib/doodstream";
export const runtime="nodejs";
export async function GET(){
 if(!await getAdminSession())return NextResponse.json({error:"Unauthorized"},{status:401});
 try{const data=await doodGet("account/info");return NextResponse.json({account:data.result});}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"DoodStream gagal dihubungi."},{status:502});}
}
