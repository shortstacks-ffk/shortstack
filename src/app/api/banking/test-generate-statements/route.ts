import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow teacher role to access this
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Call the actual statement generation API with the proper auth header
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/banking/generate-statements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });
    
    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Error in test route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}