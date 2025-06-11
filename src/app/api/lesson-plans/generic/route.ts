import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const searchParams = req.nextUrl.searchParams;
    const gradeLevel = searchParams.get("gradeLevel");
    
    let whereClause = {};
    if (gradeLevel && gradeLevel !== "all") {
      whereClause = { gradeLevel };
    }
    
    const templates = await db.genericLessonPlan.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        gradeLevel: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching generic lesson plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}