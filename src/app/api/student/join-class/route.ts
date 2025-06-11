import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";

export async function POST(request: Request) {
  try {
    // Use NextAuth session for authentication
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a student
    if (!session || !session.user || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, error: "Unauthorized - You must be logged in as a student" },
        { status: 401 }
      );
    }

    // Get userId/studentId from session
    const userId = session.user.id;
    
    // Get class code from request
    let classCode;
    try {
      const body = await request.json();
      classCode = body.classCode;
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid request format" },
        { status: 400 }
      );
    }
    
    if (!classCode) {
      return NextResponse.json(
        { success: false, error: "Class code is required" },
        { status: 400 }
      );
    }
    
    // Find the class with class sessions
    const classData = await db.class.findUnique({
      where: { code: classCode },
      select: {
        id: true,
        name: true,
        code: true,
        emoji: true,
        color: true,
        grade: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        classSessions: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true
          }
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      }
    });
    
    if (!classData) {
      return NextResponse.json(
        { success: false, error: "Invalid class code" },
        { status: 404 }
      );
    }

    // Find the student by user id or email
    let student = await db.student.findFirst({
      where: {
        OR: [
          { userId: userId },
          { schoolEmail: session.user.email || "" }
        ]
      }
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student profile not found" },
        { status: 404 }
      );
    }
    
    // Check if enrollment exists
    let enrollment = await db.enrollment.findUnique({
      where: { 
        studentId_classId: {
          studentId: student.id,
          classId: classData.id
        }
      }
    });
    
    // Format teacher name
    const teacher = classData.teacher;
    const teacherName = teacher.user?.name || 
      `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 
      'Your Teacher';
    
    // Format schedule from class sessions
    const formattedSchedule = classData.classSessions.map(session => {
      // Convert dayOfWeek number to string (0 = Sunday, 1 = Monday, etc.)
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = days[session.dayOfWeek];
      
      return {
        id: session.id,
        day: dayName,
        dayOfWeek: session.dayOfWeek,
        startTime: session.startTime,
        endTime: session.endTime
      };
    });
    
    // Create or update enrollment
    if (enrollment) {
      // If enrollment exists but not marked as enrolled, update it
      if (!enrollment.enrolled) {
        enrollment = await db.enrollment.update({
          where: { id: enrollment.id },
          data: { enrolled: true }
        });
        
        return NextResponse.json({
          success: true, 
          message: "Successfully joined class",
          class: {
            id: classData.id,
            name: classData.name,
            code: classData.code,
            emoji: classData.emoji || "📚",
            color: classData.color,
            grade: classData.grade,
            startDate: classData.startDate,
            endDate: classData.endDate,
            schedule: formattedSchedule,
            createdAt: classData.createdAt,
            teacher: {
              id: teacher.id,
              name: teacherName,
              email: teacher.user?.email,
              image: teacher.user?.image || teacher.profileImage
            }
          }
        });
      } else {
        // Already enrolled
        return NextResponse.json({
          success: true, 
          message: "Already enrolled in this class",
          class: {
            id: classData.id,
            name: classData.name,
            code: classData.code,
            emoji: classData.emoji || "📚",
            color: classData.color,
            grade: classData.grade,
            startDate: classData.startDate,
            endDate: classData.endDate,
            schedule: formattedSchedule,
            createdAt: classData.createdAt,
            teacher: {
              id: teacher.id,
              name: teacherName,
              email: teacher.user?.email,
              image: teacher.user?.image || teacher.profileImage
            }
          }
        });
      }
    } else {
      // No enrollment exists - create a new enrollment
      enrollment = await db.enrollment.create({
        data: {
          studentId: student.id,
          classId: classData.id,
          enrolled: true
        }
      });
      
      return NextResponse.json({
        success: true, 
        message: "Successfully joined class",
        class: {
          id: classData.id,
          name: classData.name,
          code: classData.code,
          emoji: classData.emoji || "📚",
          color: classData.color,
          grade: classData.grade,
          startDate: classData.startDate,
          endDate: classData.endDate,
          schedule: formattedSchedule,
          createdAt: classData.createdAt,
          teacher: {
            id: teacher.id,
            name: teacherName,
            email: teacher.user?.email,
            image: teacher.user?.image || teacher.profileImage
          }
        }
      });
    }
  } catch (error: any) {
    console.error("Join class error:", error);
    
    return NextResponse.json(
      { success: false, error: "Failed to join class: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}