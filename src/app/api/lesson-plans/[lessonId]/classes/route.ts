import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

// Updated type definition to match Next.js App Router expectations
type RouteParams = { params: Promise<{ lessonId: string }> };

export async function GET(
  req: NextRequest,
  context: RouteParams
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const lessonId = params.lessonId;
    
    // Get the classes associated with this lesson plan
    const lessonPlan = await db.lessonPlan.findUnique({
      where: { id: lessonId },
      include: {
        classes: {
          select: {
            id: true,
            name: true,
            code: true,
            teacherId: true,
          }
        }
      }
    });
    
    if (!lessonPlan) {
      return NextResponse.json(
        { error: "Lesson plan not found" },
        { status: 404 }
      );
    }
    
    // For teachers, verify they own the lesson plan
    if (session.user.role === 'TEACHER') {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!teacher || lessonPlan.teacherId !== teacher.id) {
        return NextResponse.json(
          { error: "You don't have access to this lesson plan" },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(lessonPlan.classes);
  } catch (error) {
    console.error("Error fetching classes for lesson plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 }
    );
  }
}