import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the student record
    const student = await db.student.findFirst({
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

    // Process form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const assignmentId = formData.get('assignmentId') as string;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    if (!assignmentId) {
      return NextResponse.json({ error: "Missing assignment ID" }, { status: 400 });
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    // Verify the assignment exists and student has access to it
    // Updated to work with new schema: assignments connect to classes via many-to-many
    const assignment = await db.assignment.findFirst({
      where: {
        id: assignmentId,
        classes: {
          some: {
            enrollments: {
              some: {
                studentId: student.id,
                enrolled: true
              }
            }
          }
        }
      },
      include: {
        classes: true
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    
    // Check if student is enrolled in any of the classes this assignment belongs to
    const hasAccess = await db.enrollment.findFirst({
      where: {
        studentId: student.id,
        classId: { in: assignment.classes.map(c => c.id) },
        enrolled: true
      }
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "You don't have access to this assignment" }, { status: 403 });
    }

    console.log("Student assignment submission - starting process");
    
    // Create a unique, sanitized filename
    const sanitizedFileName = file.name.replace(/\s/g, '-');
    const uniqueFileName = `submissions/${student.id}/${assignmentId}/${Date.now()}-${sanitizedFileName}`;
    
    // Upload to Vercel Blob
    const blob = await put(uniqueFileName, file, {
      access: 'public',
      contentType: file.type
    });

    console.log("Submission upload successful:", blob.url);

    // Return success response with file details
    return NextResponse.json({
      success: true,
      fileUrl: blob.url,
      fileId: blob.url.split('/').pop(),
      fileName: sanitizedFileName,
      fileType: file.type,
      size: file.size
    });
    
  } catch (error) {
    console.error("Error uploading assignment submission:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload assignment submission" },
      { status: 500 }
    );
  }
}