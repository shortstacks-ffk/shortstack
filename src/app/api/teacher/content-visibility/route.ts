import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getAuthSession } from "@/src/lib/auth";

// Make sure to implement the POST method
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Unauthorized: Teachers only" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      contentType,
      contentId,
      classIds,
      lessonPlanId,
      visibleToStudents,
      visibilityStartDate,
      dueDate,
    } = body;

    if (!contentType || !contentId || !classIds || classIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    // Create/update visibility records
    const results = [];

    for (const classId of classIds) {
      // Update based on content type
      if (contentType === "file") {
        const result = await db.classContentVisibility.upsert({
          where: {
            classId_fileId: {
              classId,
              fileId: contentId,
            },
          },
          update: {
            visibleToStudents,
            visibilityStartDate: visibilityStartDate || null,
          },
          create: {
            classId,
            fileId: contentId,
            visibleToStudents,
            visibilityStartDate: visibilityStartDate || null,
          },
        });
        results.push(result);
      } else if (contentType === "assignment") {
        const result = await db.classContentVisibility.upsert({
          where: {
            classId_assignmentId: {
              classId,
              assignmentId: contentId,
            },
          },
          update: {
            visibleToStudents,
            visibilityStartDate: visibilityStartDate || null,
            dueDate: dueDate || null,
          },
          create: {
            classId,
            assignmentId: contentId,
            visibleToStudents,
            visibilityStartDate: visibilityStartDate || null,
            dueDate: dueDate || null,
          },
        });
        results.push(result);
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error("Error in content visibility API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update content visibility" },
      { status: 500 }
    );
  }
}

// Keep your existing GET method
export async function GET(req: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const fileId = url.searchParams.get("fileId");
    const assignmentId = url.searchParams.get("assignmentId");
    const classIdsParam = url.searchParams.get("classIds");

    // Convert classIds from query string to array
    const classIds = classIdsParam?.split(",") || [];

    console.log("GET content-visibility - Request params:", {
      fileId,
      assignmentId,
      classIds,
    });

    // Validate required parameters
    if ((!fileId && !assignmentId) || classIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Query the database for visibility settings
    const settings = await db.classContentVisibility.findMany({
      where: {
        ...(fileId ? { fileId } : {}),
        ...(assignmentId ? { assignmentId } : {}),
        classId: { in: classIds },
      },
    });

    console.log("Found visibility settings:", settings);

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error("Error in content visibility API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch content visibility" },
      { status: 500 }
    );
  }
}