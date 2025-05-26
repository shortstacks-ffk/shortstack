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

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file (type and size)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    console.log("Student profile image upload - starting process");
    
    // Upload to Vercel Blob
    const blob = await put(`student-profiles/${student.id}/${Date.now()}-${file.name.replace(/\s/g, '-')}`, file, {
      access: 'public',
      contentType: file.type
    });

    console.log("Blob upload successful:", blob.url);

    // Update student profile with new image URL
    await db.student.update({
      where: { id: student.id },
      data: { profileImage: blob.url }
    });

    // Update session if user record exists
    if (student.userId) {
      await db.user.update({
        where: { id: student.userId },
        data: { image: blob.url }
      });
    }

    console.log("Database updated with new image URL");

    return NextResponse.json({
      success: true,
      imageUrl: blob.url,
      message: "Profile image updated successfully"
    });
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return NextResponse.json(
      { error: "Failed to upload profile image" },
      { status: 500 }
    );
  }
}