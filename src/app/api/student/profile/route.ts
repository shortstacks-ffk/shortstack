import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getAuthSession } from "@/src/lib/auth";

export async function GET() {
  try {
    // Get session from NextAuth using our helper
    const session = await getAuthSession();
    
    if (!session?.user?.id || session.user.role !== "student") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get student with their enrollments and classes
    const student = await db.student.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolEmail: true,
        progress: true,
        profileImage: true,
        enrollments: {
          where: { enrolled: true },
          include: {
            class: {
              select: {
                id: true,
                name: true,
                code: true,
                emoji: true,
                time: true,
                createdAt: true
              }
            }
          }
        }
      }
    });
    
    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }
    
    // Extract classes from enrollments
    const classes = student.enrollments.map(enrollment => enrollment.class);
    
    // Remove enrollments from returned student data
    const { enrollments, ...studentWithoutEnrollments } = student;
    
    return NextResponse.json({
      student: studentWithoutEnrollments,
      classes
    });
    
  } catch (error: any) {
    console.error("Profile API error:", error);
    
    return NextResponse.json(
      { error: "Failed to fetch profile", message: error.message },
      { status: 500 }
    );
  }
}