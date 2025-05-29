import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";
import { put } from "@vercel/blob";
import { Readable } from "stream";

// Set maximum request body size
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '100mb',
  },
};

// Temporary buffer cache for multiple chunk uploads
const uploadBuffers = new Map();

// Helper function to parse multipart form data with streaming
async function parseFormData(req: Request): Promise<{ fields: Record<string, string>, file: File | null }> {
  try {
    const formData = await req.formData();
    const fields: Record<string, string> = {};
    let file = null;

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        file = value;
      } else {
        fields[key] = value as string;
      }
    }

    return { fields, file };
  } catch (error) {
    console.error("Error parsing form data:", error);
    throw new Error("Failed to parse form data");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the teacher profile
    const teacherProfile = await db.teacherProfile.findFirst({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    // Parse form data
    const { fields, file } = await parseFormData(request);
    const { fileName, lessonPlanId, classId, activity } = fields;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!lessonPlanId || !classId) {
      return NextResponse.json({ error: "Missing required data (lessonPlanId or classId)" }, { status: 400 });
    }

    // Increased file size limit to 100MB for larger files
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 100MB)" }, { status: 400 });
    }

    // Verify the teacher has access to this class and lesson plan
    const lessonPlan = await db.lessonPlan.findFirst({
      where: {
        id: lessonPlanId,
        class: {
          code: classId,
          userId: session.user.id
        }
      }
    });

    if (!lessonPlan) {
      return NextResponse.json({ 
        error: "Lesson plan not found or you don't have access to it" 
      }, { status: 403 });
    }

    console.log("Teacher file upload - starting process");
    
    // Create a unique, sanitized filename
    const sanitizedFileName = (fileName || file.name).replace(/\s/g, '-');
    const fileExtension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const uniqueFileName = `materials/${teacherProfile.userId}/${lessonPlanId}/${uniqueId}${fileExtension}`;
    
    // Use optimized blob upload with proper content type detection
    const blob = await put(uniqueFileName, file, {
      access: 'public',
      contentType: file.type || getMimeType(file.name),
      addRandomSuffix: false, // We already add uniqueness
    });

    console.log("Blob upload successful:", blob.url);

    // Return success response with file details
    return NextResponse.json({
      success: true,
      fileUrl: blob.url,
      fileId: blob.url.split('/').pop(),
      fileName: sanitizedFileName,
      fileType: file.type || getMimeType(file.name),
      size: file.size,
      activity: activity || 'interactive'
    });
    
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// Helper function to determine MIME type from file extension
function getMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'zip': 'application/zip',
    'rar': 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
  };

  return mimeTypes[extension] || 'application/octet-stream';
}