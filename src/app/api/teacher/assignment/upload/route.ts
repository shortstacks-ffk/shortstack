import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the teacher record - using teacherProfile instead of teacher
    const teacherProfile = await db.teacherProfile.findFirst({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    // Process form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string || file.name;
    const lessonPlanId = formData.get('lessonPlanId') as string;
    const classId = formData.get('classId') as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!lessonPlanId || !classId) {
      return NextResponse.json({ error: "Missing required data (lessonPlanId or classId)" }, { status: 400 });
    }

    // Validate file size (50MB limit)
    if (file.size > 250 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 250MB)" }, { status: 400 });
    }

    console.log("Teacher assignment upload - starting process");
    
    // Create a unique, sanitized filename
    const sanitizedFileName = fileName.replace(/\s/g, '-');
    const uniqueFileName = `assignments/${teacherProfile.userId}/${lessonPlanId}/${Date.now()}-${sanitizedFileName}`;
    
    // Upload to Vercel Blob
    const blob = await put(uniqueFileName, file, {
      access: 'public',
      contentType: file.type
    });

    console.log("Blob upload successful:", blob.url);

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
    console.error("Error uploading assignment file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload assignment file" },
      { status: 500 }
    );
  }
}