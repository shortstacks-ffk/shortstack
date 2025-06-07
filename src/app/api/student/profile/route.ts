import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find student profile using userId or email
    let student = null;
    
    // If we have a studentId in the session, use it directly
    if (session.user.studentId) {
      student = await db.student.findUnique({
        where: { id: session.user.studentId },
        include: {
          teacher: true,
          enrollments: {
            include: {
              class: true
            }
          },
          bankAccounts: true
        }
      });
    } else {
      // Try multiple approaches to find the student
      student = await db.student.findFirst({
        where: {
          OR: [
            { userId: session.user.id },
            ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
          ]
        },
        include: {
          teacher: true,
          enrollments: {
            include: {
              class: true
            }
          },
          bankAccounts: true
        }
      });
    }
    
    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }
    
    // Get classes through enrollments
    const classes = student.enrollments.map(enrollment => ({
      id: enrollment.class.id,
      name: enrollment.class.name,
      emoji: enrollment.class.emoji,
      code: enrollment.class.code,
      color: enrollment.class.color,
      enrolled: enrollment.enrolled
    }));
    
    // Format response
    return NextResponse.json({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      schoolEmail: student.schoolEmail,
      profileImage: student.profileImage,
      progress: student.progress,
      lastLogin: student.lastLogin,
      teacher: {
        id: student.teacher.id,
        firstName: student.teacher.firstName,
        lastName: student.teacher.lastName,
        institution: student.teacher.institution
      },
      classes,
      bankAccounts: student.bankAccounts
    });
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const data = await req.json();
    
    // Find student profile
    let student = await db.student.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
        ]
      }
    });
    
    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }
    
    // Update student profile
    const updatedStudent = await db.student.update({
      where: { id: student.id },
      data: {
        profileImage: data.profileImage
      }
    });
    
    return NextResponse.json({
      message: "Profile updated successfully",
      student: {
        id: updatedStudent.id,
        firstName: updatedStudent.firstName,
        lastName: updatedStudent.lastName,
        profileImage: updatedStudent.profileImage
      }
    });
  } catch (error) {
    console.error("Error updating student profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}