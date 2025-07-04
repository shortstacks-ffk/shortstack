import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: "Unauthorized. Students only." },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const classId = resolvedParams.classId;
    
    // Verify the student is enrolled in this class
    const student = await db.student.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }
    
    const enrollment = await db.enrollment.findFirst({
      where: {
        classId,
        studentId: student.id,
        enrolled: true
      }
    });
    
    if (!enrollment) {
      return NextResponse.json(
        { error: "You are not enrolled in this class" },
        { status: 403 }
      );
    }
    
    // Get all visibility settings for this class
    const visibilitySettings = await db.classContentVisibility.findMany({
      where: { classId },
      include: {
        file: {
          select: {
            id: true,
            name: true
          }
        },
        assignment: {
          select: {
            id: true,
            name: true,
            dueDate: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: visibilitySettings
    });
  } catch (error) {
    console.error("Error fetching content visibility:", error);
    return NextResponse.json(
      { error: "Failed to fetch visibility settings" },
      { status: 500 }
    );
  }
}