import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { db } from "@/src/lib/db";

export async function POST(request: Request) {
  try {
    // Get the auth token from cookies with proper awaiting
    const cookieStore = await cookies();
    const token = cookieStore.get('student-auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }
    
    // Get JWT secret from environment, with fallback for development only
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.warn("WARNING: JWT_SECRET is not set in environment variables");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    // Verify and decode the token
    let decoded;
    try {
      decoded = verify(token, jwtSecret) as { 
        studentId: string, 
        email: string 
      };
    } catch (tokenError) {
      console.error("Token verification failed:", tokenError);
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    
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
    
    // Find the class
    const classData = await db.class.findUnique({
      where: { code: classCode }
    });
    
    if (!classData) {
      return NextResponse.json(
        { success: false, error: "Invalid class code" },
        { status: 404 }
      );
    }

    // Find the student
    const student = await db.student.findUnique({
      where: { id: decoded.studentId }
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 }
      );
    }
    
    // Check if enrollment exists
    let enrollment = await db.enrollment.findUnique({
      where: { 
        studentId_classId: {
          studentId: decoded.studentId,
          classId: classData.id
        }
      }
    });
    
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
            emoji: classData.emoji
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
            emoji: classData.emoji
          }
        });
      }
    } else {
      // No enrollment exists - create a new enrollment
      enrollment = await db.enrollment.create({
        data: {
          studentId: decoded.studentId,
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
          emoji: classData.emoji
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