import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  return NextResponse.json({
    authenticated: !!session,
    session: session,
    timestamp: new Date().toISOString()
  });
}