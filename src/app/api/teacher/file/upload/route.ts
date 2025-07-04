import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

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
          genericLessonPlanId, 
          isGeneric, 
          activity,
          fileName,
          fileSize
        } = uploadParams;

        console.log('Upload token generation:', { 
          role: session.user.role, 
          isGeneric, 
          lessonPlanId, 
          genericLessonPlanId,
          fileName,
          fileSize,
          originalPathname: pathname
        });

        let teacherId;
        let userType;

        // Handle SUPER users uploading to generic lesson plans
        if (session.user.role === "SUPER" && isGeneric && genericLessonPlanId) {
          console.log('Processing SUPER user upload to generic lesson plan');
          
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
          
          // Verify generic lesson plan exists
          const genericPlan = await db.genericLessonPlan.findUnique({
            where: { id: genericLessonPlanId }
          });
          
          if (!genericPlan) {
            throw new Error("Generic lesson plan not found");
          }
          
        } 
        // Handle TEACHER users or SUPER users uploading to regular lesson plans
        else if (lessonPlanId) {
          console.log('Processing regular lesson plan upload');
          
          // For SUPER users uploading to regular lesson plans, ensure they have a teacher record
          if (session.user.role === "SUPER") {
            let superTeacher = await db.teacher.findUnique({
              where: { userId: session.user.id }
            });
            
            if (!superTeacher) {
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
            }
            
            teacherId = superTeacher.id;
            userType = 'super';
            
            // SUPER users can access any lesson plan
            const lessonPlan = await db.lessonPlan.findUnique({
              where: { id: lessonPlanId }
            });

            if (!lessonPlan) {
              throw new Error("Lesson plan not found");
            }
            
          } else {
            // Regular TEACHER user
            const teacher = await db.teacher.findUnique({
              where: { userId: session.user.id },
            });

            if (!teacher) {
              throw new Error("Teacher profile not found");
            }
            
            teacherId = teacher.id;
            userType = 'teacher';
            
            // Verify the lesson plan exists and teacher has access to it
            const lessonPlan = await db.lessonPlan.findUnique({
              where: { id: lessonPlanId }
            });

            if (!lessonPlan) {
              throw new Error("Lesson plan not found");
            }
            
            // Verify teacher owns the lesson plan (only for regular teachers)
            if (lessonPlan.teacherId !== teacherId) {
              throw new Error("You don't have access to this lesson plan");
            }
          }
          
          userType = userType || 'teacher';
        } else {
          throw new Error("Invalid upload parameters");
        }

        console.log('Authorization successful:', { teacherId, userType });

        // Generate token with metadata for upload completion
        return {
          allowedContentTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/webm', 'video/quicktime',
            'application/pdf', 'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain', 'text/csv', 'application/zip', 'application/x-zip-compressed'
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            teacherId,
            lessonPlanId,
            genericLessonPlanId,
            isGeneric,
            activity,
            fileName,
            fileSize,
            userType
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Just log the completion - don't create database records here
        console.log('🚀 Upload completed:', blob.url);
        console.log('🚀 Blob size:', blob.url.length);
        
        // The client will handle database creation using the createFile action
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("❌ Upload route error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}