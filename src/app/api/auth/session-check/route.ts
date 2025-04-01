import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        authenticated: false,
        message: "No session found"
      });
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user?.id,
        role: session.user?.role,
        email: session.user?.email,
        name: session.user?.name
      }
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ 
      authenticated: false,
      error: "Error checking session"
    }, { status: 500 });
  }
}