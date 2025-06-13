import { NextResponse } from "next/server";
import { getAuthSession } from "@/src/lib/auth";

export async function GET() {
  const session = await getAuthSession();

  console.log("Check-super API call with session:", {
    hasSession: !!session,
    userId: session?.user?.id,
    role: session?.user?.role,
    isSuperUser: session?.user?.isSuperUser
  });

  if (!session || !session.user) {
    return NextResponse.json(
      { 
        isSuperUser: false,
        error: "Not authenticated" 
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    isSuperUser: session.user.role === "SUPER"
  });
}