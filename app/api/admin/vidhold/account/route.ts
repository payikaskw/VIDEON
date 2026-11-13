import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { vidholdAccount } from "@/lib/vidhold";
export const runtime = "nodejs";
export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await vidholdAccount();
    return NextResponse.json({ account: data.result || {} });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Vidhold tidak dapat dihubungi." }, { status: 502 });
  }
}
