import { NextResponse } from "next/server";
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from "@/src/lib/db";

export async function GET(request: Request) {
  try {
    // Get the auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('student-auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Verify and decode the token
    const decoded = verify(
      token, 
      process.env.JWT_SECRET || 'fallback-secret-key-for-development'
    ) as { studentId: string, email: string };
    
    // Get student with their enrollments and classes
    const student = await db.student.findUnique({
      where: { id: decoded.studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolEmail: true,
        progress: true,
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
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}