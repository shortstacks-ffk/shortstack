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

    // Find the teacher record
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { teacherProfile: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    console.log("Uploading image to Vercel Blob...");
    console.log("File type:", file.type);
    console.log("File size:", file.size);
    
    // Upload to Vercel Blob
    try {
      const blob = await put(
        `teacher-profiles/${user.id}/${Date.now()}-${file.name.replace(/\s/g, '-')}`, 
        file, 
        {
          access: 'public',
          contentType: file.type
        }
      );
      
      console.log("Blob upload successful:", blob.url);
      
      // Update user with new image URL
      await db.user.update({
        where: { id: user.id },
        data: { image: blob.url }
      });

      return NextResponse.json({
        success: true,
        imageUrl: blob.url,
        message: "Profile image updated successfully"
      });
    } catch (blobError) {
      console.error("Vercel Blob upload error:", blobError);
      return NextResponse.json(
        { error: "Failed to upload image to storage" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return NextResponse.json(
      { error: "Failed to upload profile image" },
      { status: 500 }
    );
  }
}