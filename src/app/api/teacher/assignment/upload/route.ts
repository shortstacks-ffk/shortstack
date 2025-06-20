import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // If this is a client-side upload request from Vercel Blob
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = (await request.json()) as HandleUploadBody;
      
      return await handleClientUpload(body, request);
    }
    
    // Otherwise, handle as a regular form upload (legacy method)
    return await handleFormUpload(request);
  } catch (error) {
    console.error("Error in assignment upload route:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process upload" },
      { status: 500 }
    );
  }
}

// Handle client-side uploads from Vercel Blob
async function handleClientUpload(body: HandleUploadBody, request: Request): Promise<NextResponse> {
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Authenticate and authorize users before generating the token
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER")) {
          throw new Error("Unauthorized");
        }

        // Parse client payload to get upload parameters
        const uploadParams = clientPayload ? JSON.parse(clientPayload) : {};
        const { 
          lessonPlanId, 
          classId,
          isGeneric,
          fileName,
          fileSize
        } = uploadParams;

        console.log('Assignment upload token generation:', { 
          role: session.user.role, 
          lessonPlanId,
          isGeneric,
          classId,
          fileName,
          fileSize,
          originalPathname: pathname
        });

        let teacherId;
        let userType;

        // Handle SUPER users
        if (session.user.role === "SUPER") {
          // Find or create a teacher record for the super user
          let superTeacher = await db.teacher.findUnique({
            where: { userId: session.user.id }
          });
          
          if (!superTeacher) {
            console.log('Creating teacher record for SUPER user');
            
            const superUser = await db.user.findUnique({
              where: { id: session.user.id },
              select: { name: true, id: true }
            });
            
            if (!superUser) {
              throw new Error("User not found");
            }
            
            let firstName = "Super";
            let lastName = "User";
            
            if (superUser.name) {
              const nameParts = superUser.name.trim().split(' ');
              firstName = nameParts[0] || "Super";
              lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "User";
            }
            
            superTeacher = await db.teacher.create({
              data: {
                userId: superUser.id,
                firstName,
                lastName,
              }
            });
            
            console.log('Teacher record created for SUPER user:', superTeacher.id);
          }
          
          teacherId = superTeacher.id;
          userType = 'super';
          
          if (isGeneric) {
            // Check if generic lesson plan exists for SUPER user
            const genericPlan = await db.genericLessonPlan.findUnique({
              where: { id: lessonPlanId }
            });
            
            if (!genericPlan) {
              throw new Error("Generic lesson plan not found");
            }
          } else {
            // SUPER users can access any regular lesson plan
            const lessonPlan = await db.lessonPlan.findUnique({
              where: { id: lessonPlanId }
            });

            if (!lessonPlan) {
              throw new Error("Lesson plan not found");
            }
          }
        } 
        // Handle TEACHER users
        else { 
          // Regular TEACHER user
          const teacher = await db.teacher.findUnique({
            where: { userId: session.user.id },
          });

          if (!teacher) {
            throw new Error("Teacher profile not found");
          }
          
          teacherId = teacher.id;
          userType = 'teacher';
          
          if (!lessonPlanId) {
            throw new Error("Missing lessonPlanId");
          }

          // Verify the lesson plan exists and teacher has access to it
          const lessonPlan = await db.lessonPlan.findFirst({
            where: {
              id: lessonPlanId,
              teacherId: teacher.id,
            }
          });

          if (!lessonPlan) {
            throw new Error("Lesson plan not found or you don't have access");
          }
          
          // If classId is provided, verify access to that class as well
          if (classId) {
            const classObj = await db.class.findFirst({
              where: { 
                code: classId,
                teacherId: teacher.id
              }
            });

            if (!classObj) {
              throw new Error("Class not found or you don't have access");
            }

            // Verify the lesson plan is associated with this class
            const lessonPlanForClass = await db.lessonPlan.findFirst({
              where: {
                id: lessonPlanId,
                classes: {
                  some: {
                    id: classObj.id
                  }
                }
              }
            });

            if (!lessonPlanForClass && !isGeneric) {
              console.warn("Lesson plan not associated with provided class");
            }
          }
        }

        console.log('Assignment upload authorization successful:', { 
          teacherId, 
          userType, 
          isGeneric: !!isGeneric 
        });

        // Generate token with metadata for upload completion
        return {
          allowedContentTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/webm', 'video/quicktime',
            'application/pdf', 'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain', 'text/csv', 'application/zip', 'application/x-zip-compressed',
            'application/octet-stream',  // Allow any binary file
          ],
          maximumSizeInBytes: 250 * 1024 * 1024, // 250MB limit
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            teacherId,
            lessonPlanId,
            isGeneric: !!isGeneric,
            ...(classId ? { classId } : {}), // Only include classId if provided
            fileName,
            fileSize,
            userType
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Just log the completion - don't create database records here
        console.log('🚀 Assignment upload completed:', blob.url);
        console.log('🚀 Assignment blob size:', blob.url.length);
        
        // The client will handle database creation using the createAssignment action
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("❌ Assignment upload route error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

// Legacy form-based upload handler (for backward compatibility)
async function handleFormUpload(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Process form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string || file.name;
    const lessonPlanId = formData.get('lessonPlanId') as string;
    const isGeneric = formData.get('isGeneric') === 'true';
    const classId = formData.get('classId') as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!lessonPlanId) {
      return NextResponse.json({ error: "Missing lessonPlanId" }, { status: 400 });
    }

    // Validate file size (250MB limit)
    if (file.size > 250 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 250MB)" }, { status: 400 });
    }

    // Get or create teacher record based on role
    let teacherId;
    let uniquePath;
    
    if (session.user.role === "SUPER") {
      // For super users - find or create teacher record
      let superTeacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!superTeacher) {
        console.log('Creating teacher record for SUPER user');
        
        const superUser = await db.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, id: true }
        });
        
        if (!superUser) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        
        let firstName = "Super";
        let lastName = "User";
        
        if (superUser.name) {
          const nameParts = superUser.name.trim().split(' ');
          firstName = nameParts[0] || "Super";
          lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "User";
        }
        
        superTeacher = await db.teacher.create({
          data: {
            userId: superUser.id,
            firstName,
            lastName,
          }
        });
      }
      
      teacherId = superTeacher.id;
      
      // Create unique path for super user uploads
      const sanitizedFileName = fileName.replace(/\s/g, '-');
      const pathType = isGeneric ? 'generic' : 'super';
      uniquePath = `assignments/${pathType}/${lessonPlanId}/${Date.now()}-${sanitizedFileName}`;
    } 
    else {
      // Regular teacher flow
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher) {
        return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
      }

      teacherId = teacher.id;

      // Check lesson plan ownership
      const lessonPlan = await db.lessonPlan.findFirst({
        where: {
          id: lessonPlanId,
          teacherId: teacher.id,
        }
      });

      if (!lessonPlan) {
        return NextResponse.json({ error: "Lesson plan not found or you don't have access" }, { status: 403 });
      }

      // Create a unique, sanitized filename for regular teachers
      const sanitizedFileName = fileName.replace(/\s/g, '-');
      const pathType = isGeneric ? 'generic-assignments' : 'teacher/assignments';
      uniquePath = `${pathType}/${teacher.id}/${lessonPlanId}/${Date.now()}-${sanitizedFileName}`;
    }
    
    console.log(`${session.user.role} assignment upload - using path:`, uniquePath);
    
    // Upload to Vercel Blob
    const blob = await import('@vercel/blob').then(({ put }) => put(uniquePath, file, {
      access: 'public',
      contentType: file.type
    }));

    console.log("Blob upload successful:", blob.url);

    // Return success response with file details
    return NextResponse.json({
      success: true,
      fileUrl: blob.url,
      fileId: blob.url.split('/').pop(),
      fileName: fileName,
      fileType: file.type,
      size: file.size,
      isGeneric: isGeneric
    });
    
  } catch (error) {
    console.error("Error uploading assignment file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload assignment file" },
      { status: 500 }
    );
  }
}