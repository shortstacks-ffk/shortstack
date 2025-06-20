'use server';

import { db } from '@/src/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth/config';
import { revalidatePath } from 'next/cache';
import { del } from '@vercel/blob';

interface FileData {
  name: string;
  fileType: string;
  activity?: string;
  size: number;
  url: string;
  classId?: string;
  lessonPlanIds?: string[];
  genericLessonPlanIds?: string[];
}

interface FileResponse {
  success: boolean;
  data?: any;
  error?: string;
  files?: any[];
}

// Get files for a lesson plan (supports both regular and generic lesson plans)
export async function getFiles(lessonPlanId: string, isGeneric: boolean = false): Promise<FileResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    console.log('getFiles called with:', { lessonPlanId, isGeneric, userRole: session.user.role });

    let files;
    
    if (isGeneric) {
      // Fetch files for generic lesson plans
      console.log('Fetching files for generic lesson plan:', lessonPlanId);
      
      // First, let's check if there are ANY files connected to this generic lesson plan at all
      const allFilesForGeneric = await db.$queryRaw`
        SELECT f.*, glp.name as genericPlanName 
        FROM "File" f
        JOIN "_GenericLessonPlanFiles" glpf ON f.id = glpf."A"
        JOIN "GenericLessonPlan" glp ON glpf."B" = glp.id
        WHERE glp.id = ${lessonPlanId}
      `;
      
      console.log('Raw query result for generic files:', allFilesForGeneric);
      
      const genericPlan = await db.genericLessonPlan.findUnique({
        where: { id: lessonPlanId },
        include: {
          files: {
            include: {
              teacher: {
                select: { firstName: true, lastName: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      console.log('Generic plan found:', !!genericPlan);
      console.log('Files in generic plan via Prisma:', genericPlan?.files?.length || 0);
      
      // Let's also check all files in the system and see which ones have generic lesson plan connections
      const allFiles = await db.file.findMany({
        include: {
          GenericLessonPlan: true,
          teacher: true
        }
      });
      
      console.log('All files in system:', allFiles.length);
      console.log('Files with generic lesson plan connections:', 
        allFiles.filter(f => f.GenericLessonPlan && f.GenericLessonPlan.length > 0).length
      );

      if (!genericPlan) {
        return { success: false, error: 'Generic lesson plan not found' };
      }

      // Authorization: SUPER users can access any generic plan, teachers can view but not edit
      if (session.user.role !== 'SUPER' && session.user.role !== 'TEACHER') {
        return { success: false, error: 'Unauthorized to access this content' };
      }

      files = genericPlan.files;
    } else {
      // Fetch files for regular lesson plans
      console.log('Fetching files for regular lesson plan:', lessonPlanId);
      
      const lessonPlan = await db.lessonPlan.findUnique({
        where: { id: lessonPlanId },
        include: {
          files: {
            include: {
              teacher: {
                select: { firstName: true, lastName: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          teacher: true
        }
      });

      console.log('Lesson plan found:', !!lessonPlan);
      console.log('Files in lesson plan:', lessonPlan?.files?.length || 0);

      if (!lessonPlan) {
        return { success: false, error: 'Lesson plan not found' };
      }

      // Authorization check for regular lesson plans
      if (session.user.role === 'TEACHER') {
        const teacher = await db.teacher.findUnique({
          where: { userId: session.user.id }
        });

        if (!teacher || lessonPlan.teacherId !== teacher.id) {
          return { success: false, error: 'You do not have access to this lesson plan' };
        }
      } else if (session.user.role === 'SUPER') {
        // SUPER users can access any lesson plan
      } else {
        return { success: false, error: 'Unauthorized' };
      }

      files = lessonPlan.files;
    }

    // Convert files to the format expected by FileTable
    const serializedFiles = files.map(file => ({
      id: file.id,
      name: file.name,
      fileType: file.fileType,
      activity: file.activity,
      createdAt: file.createdAt.toISOString(),
      size: file.size,
      url: file.url,
    }));

    console.log('Returning serialized files:', serializedFiles.length);
    return { success: true, files: serializedFiles };
  } catch (error) {
    console.error('Error fetching files:', error);
    return { success: false, error: 'Failed to fetch files' };
  }
}

// Create a file (for both regular and generic lesson plans)
export async function createFile(data: FileData): Promise<FileResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER')) {
      return { success: false, error: 'Unauthorized' };
    }

    console.log('createFile called with:', data);

    // Get or create teacher record
    let teacherId;
    if (session.user.role === 'SUPER') {
      let superTeacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!superTeacher) {
        const superUser = await db.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, id: true }
        });
        
        if (!superUser) {
          return { success: false, error: 'User not found' };
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
        
        console.log('Created teacher record for SUPER user:', superTeacher.id);
      }
      
      teacherId = superTeacher.id;
    } else {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher) {
        return { success: false, error: 'Teacher profile not found' };
      }
      
      teacherId = teacher.id;
    }

    if (!data.name || !data.fileType || !data.url) {
      return { success: false, error: 'Missing required fields' };
    }

    // Create file with appropriate connections
    const fileData = {
      name: data.name,
      fileType: data.fileType,
      activity: data.activity || 'interactive',
      size: data.size || 0,
      url: data.url,
      teacherId: teacherId,
    };

    let createdFile;

    if (data.genericLessonPlanIds && data.genericLessonPlanIds.length > 0) {
      // For generic lesson plans - using many-to-many relationship
      console.log('Creating file for generic lesson plan:', data.genericLessonPlanIds);
      
      createdFile = await db.file.create({
        data: {
          ...fileData,
          GenericLessonPlan: {
            connect: data.genericLessonPlanIds.map(id => ({ id })) // This is correct for many-to-many
          }
        },
        include: {
          GenericLessonPlan: true,
          teacher: true
        }
      });
      
      console.log('File created for generic lesson plan:', createdFile.id);
      
    } else if (data.lessonPlanIds && data.lessonPlanIds.length > 0) {
      // For regular lesson plans - using many-to-many relationship
      console.log('Creating file for regular lesson plans:', data.lessonPlanIds);
      
      createdFile = await db.file.create({
        data: {
          ...fileData,
          lessonPlans: {
            connect: data.lessonPlanIds.map(id => ({ id })) // This one is correct
          }
        },
        include: {
          lessonPlans: true,
          teacher: true
        }
      });
      
      console.log('File created for regular lesson plans:', createdFile.id);
      
    } else {
      return { success: false, error: 'Must specify either genericLessonPlanId or lessonPlanIds' };
    }

    return { success: true, data: createdFile };
  } catch (error: any) {
    console.error('Create file error:', error);
    return { success: false, error: 'Failed to create file: ' + (error?.message || '') };
  }
}

// Get a single file by ID
export async function getFileByID(id: string): Promise<FileResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const file = await db.file.findUnique({
      where: { id },
      include: { 
        lessonPlans: true,
        GenericLessonPlan: true,
        classes: true,
        teacher: true
      },
    });

    if (!file) {
      return { success: false, error: 'File not found' };
    }

    // Authorization check
    if (session.user.role === 'TEACHER') {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher || file.teacherId !== teacher.id) {
        return { success: false, error: 'You do not have access to this file' };
      }
    } else if (session.user.role === 'SUPER') {
      // SUPER users can access any file
    } else if (session.user.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.user.id }
      });

      if (!student) {
        return { success: false, error: 'Student profile not found' };
      }

      // Check if student is enrolled in any of the classes this file belongs to
      const hasAccess = await db.enrollment.findFirst({
        where: {
          studentId: student.id,
          classId: { in: file.classes.map(c => c.id) },
          enrolled: true
        }
      });

      if (!hasAccess) {
        return { success: false, error: 'You do not have access to this file' };
      }
    }

    return { success: true, data: file };
  } catch (error: any) {
    console.error('Get file error:', error);
    return { success: false, error: 'Failed to get file' };
  }
}

// Update a file by ID
export async function updateFile(id: string, data: Partial<FileData>): Promise<FileResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER')) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get teacher record
    let teacherId;
    if (session.user.role === 'SUPER') {
      const superTeacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });
      teacherId = superTeacher?.id;
    } else {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });
      teacherId = teacher?.id;
    }

    if (!teacherId) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Verify file exists and check permissions
    const existingFile = await db.file.findUnique({
      where: { id },
      include: { 
        classes: { select: { code: true } },
        teacher: true
      }
    });

    if (!existingFile) {
      return { success: false, error: 'File not found' };
    }
    
    // Authorization: SUPER users can edit any file, teachers can only edit their own
    if (session.user.role === 'TEACHER' && existingFile.teacherId !== teacherId) {
      return { success: false, error: 'You do not have permission to edit this file' };
    }

    // Validate only essential fields
    if (data.name && !data.name.trim()) {
      return { success: false, error: 'File name is required' };
    }

    const updatedFile = await db.file.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.activity && { activity: data.activity }),
      },
      include: { 
        lessonPlans: true,
        GenericLessonPlan: true,
        classes: true
      },
    });

    // Revalidate paths
    for (const classObj of existingFile.classes) {
      revalidatePath(`/teacher/dashboard/classes/${classObj.code}`);
    }
    
    return { success: true, data: updatedFile };
  } catch (error: any) {
    console.error('Update file error:', error);
    return { success: false, error: 'Failed to update file: ' + (error?.message || '') };
  }
}

// Delete a file by ID
export async function deleteFile(id: string): Promise<FileResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER')) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get the file with its URL to delete from Blob storage
    const file = await db.file.findUnique({
      where: { id },
      select: { 
        url: true, 
        teacherId: true,
        teacher: {
          select: { userId: true }
        }
      }
    });

    if (!file) {
      return { success: false, error: 'File not found' };
    }

    // Authorization check
    if (session.user.role === 'TEACHER') {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher || teacher.id !== file.teacherId) {
        return { success: false, error: 'You do not have permission to delete this file' };
      }
    }
    // SUPER users can delete any file

    // Delete from Vercel Blob storage
    let blobDeleteResult = true;
    try {
      console.log(`Attempting to delete file from blob storage: ${file.url}`);
      
      // Extract the blob path from the URL
      const urlObj = new URL(file.url);
      const pathname = urlObj.pathname;
      // The pathname typically starts with a leading slash that we need to remove
      const blobPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
      
      if (!blobPath) {
        console.error("Invalid blob path extracted from URL:", file.url);
        blobDeleteResult = false;
      } else {
        console.log(`Deleting blob at path: ${blobPath}`);
        await del(blobPath);
        console.log("Blob deleted successfully");
      }
    } catch (blobError) {
      console.error('Failed to delete file from blob storage:', blobError);
      blobDeleteResult = false;
      // Continue with database deletion even if blob deletion fails
    }

    // Delete from database
    await db.file.delete({
      where: { id }
    });

    return { 
      success: true,
      data: { blobDeleted: blobDeleteResult } 
    };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: 'Failed to delete file' };
  }
}

// Copy file to lesson plan
export async function copyFileToLessonPlan({
  sourceFileId,
  targetLessonPlanId,
  targetClassId,
}: {
  sourceFileId: string;
  targetLessonPlanId: string;
  targetClassId: string;
}): Promise<FileResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER')) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get teacher record
    let teacherId;
    if (session.user.role === 'SUPER') {
      const superTeacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });
      teacherId = superTeacher?.id;
    } else {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });
      teacherId = teacher?.id;
    }

    if (!teacherId) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Verify source file exists
    const sourceFile = await db.file.findUnique({
      where: { id: sourceFileId },
      include: { classes: true }
    });

    if (!sourceFile) {
      return { success: false, error: 'Source file not found' };
    }

    // Authorization check for source file
    if (session.user.role === 'TEACHER' && sourceFile.teacherId !== teacherId) {
      return { success: false, error: 'You do not have permission to copy this file' };
    }

    // Verify target class belongs to teacher (for non-SUPER users)
    if (session.user.role === 'TEACHER') {
      const targetClass = await db.class.findFirst({
        where: { 
          code: targetClassId,
          teacherId: teacherId
        }
      });
      
      if (!targetClass) {
        return { success: false, error: 'Target class not found or you do not have permission' };
      }
    }

    // Create a new file record with the same details but new connections
    const newFile = await db.file.create({
      data: {
        name: sourceFile.name,
        fileType: sourceFile.fileType,
        activity: sourceFile.activity,
        size: sourceFile.size || 0,
        url: sourceFile.url,
        teacherId: teacherId,
        lessonPlans: {
          connect: { id: targetLessonPlanId },
        },
      },
      include: { 
        lessonPlans: true,
        classes: true
      },
    });

    revalidatePath(`/teacher/dashboard/classes/${targetClassId}`);
    return { success: true, data: newFile };
  } catch (error: any) {
    console.error('Copy file error:', error);
    return { success: false, error: 'Failed to copy file to lesson plan: ' + (error?.message || '') };
  }
}