import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { getAuthSession } from '@/src/lib/auth';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }
    
    // Properly await the params object
    const { classId } = await context.params;
    console.log("API: Looking up class with ID:", classId);
    
    // First, try to find the class by its ID
    let classData = await db.class.findFirst({
      where: {
        id: classId,
        teacherId: teacher.id
      },
      include: {
        lessonPlans: true,
        teacher: {
          select: {
            id: true,
            // Remove 'name' and use fields that exist in your schema
            userId: true,
            // You can add other fields that actually exist in your Teacher model
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    // If not found by ID, try to find by code
    if (!classData) {
      classData = await db.class.findFirst({
        where: {
          code: classId,
          teacherId: teacher.id
        },
        include: {
          lessonPlans: true,
          teacher: {
            select: {
              id: true,
              // Remove 'name' and use fields that exist in your schema
              userId: true,
              // You can add other fields that actually exist in your Teacher model
              firstName: true,
              lastName: true
            }
          }
        }
      });
    }
    
    if (!classData) {
      return NextResponse.json({ error: "Class not found or you don't have access" }, { status: 404 });
    }
    
    return NextResponse.json(classData);
  } catch (error: any) {
    console.error("Error fetching class:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch class" },
      { status: 500 }
    );
  }
}