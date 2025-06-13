import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Allow both TEACHER and SUPER users
    if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user record
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // For SUPER users, we don't need a teacher profile
    if (session.user.role === "SUPER") {
      // Process form data for super user
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "No valid file provided" }, { status: 400 });
      }

      // Validate file (type and size)
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: "File must be an image" }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
      }

      console.log("Uploading super user image to Vercel Blob...");
      
      try {
        const filename = `super-user-${user.id}-${Date.now()}-${file.name.replace(/\s/g, '-')}`;
        const blob = await put(filename, file, {
          access: 'public',
          contentType: file.type
        });
        
        console.log("Blob upload successful for super user:", blob.url);
        
        return NextResponse.json({
          success: true,
          imageUrl: blob.url,
          message: "Image uploaded successfully"
        });
      } catch (blobError) {
        console.error("Vercel Blob upload error:", blobError);
        return NextResponse.json(
          { error: "Failed to upload image to storage" },
          { status: 500 }
        );
      }
    }
    
    // For TEACHER users, proceed with existing logic
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    // Process form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No valid file provided" }, { status: 400 });
    }

    // Validate file (type and size)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    console.log("Uploading teacher image to Vercel Blob...");
    console.log("File type:", file.type);
    console.log("File size:", file.size);
    
    // Upload to Vercel Blob
    try {
      const filename = `teacher-${teacher.id}-${Date.now()}-${file.name.replace(/\s/g, '-')}`;
      const blob = await put(filename, file, {
        access: 'public',
        contentType: file.type
      });
      
      console.log("Blob upload successful:", blob.url);
      
      return NextResponse.json({
        success: true,
        imageUrl: blob.url,
        message: "Image uploaded successfully"
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