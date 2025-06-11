'use server';

import { db } from '@/src/lib/db';
import { getAuthSession } from '@/src/lib/auth';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

interface FileData {
  name: string;
  fileType: string;
  activity?: string;
  size: number;
  url: string;
  classId: string;
  // Optionally associate with lesson plans (by their IDs)
  lessonPlanIds?: string[];
}

interface FileResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Create a file using the required fields from the dialog form.
export async function createFile(data: FileData): Promise<FileResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized' };
    }

    // Get teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    if (!data.name || !data.fileType || !data.url || !data.classId) {
      return { success: false, error: 'Missing required fields' };
    }

    // Verify the class belongs to the teacher
    const classObj = await db.class.findFirst({
      where: { 
        code: data.classId,
        teacherId: teacher.id
      }
    });
    
    if (!classObj) {
      return { success: false, error: 'Class not found or you do not have permission' };
    }

    const createdFile = await db.file.create({
      data: {
        name: data.name,
        fileType: data.fileType,
        activity: data.activity,
        size: data.size || 0,
        url: data.url,
        teacherId: teacher.id,
        classes: {
          connect: { id: classObj.id }
        },
        lessonPlans: data.lessonPlanIds && data.lessonPlanIds.length > 0
          ? {
              connect: data.lessonPlanIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        classes: true,
        lessonPlans: true
      }
    });

    revalidatePath(`/teacher/dashboard/classes/${classObj.code}`);
    return { success: true, data: createdFile };
  } catch (error: any) {
    console.error('Create file error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to create file: ' + (error?.message || '') };
  }
}

// Get a single file by ID including its related lesson plans.
export async function getFileByID(id: string): Promise<FileResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const file = await db.file.findUnique({
      where: { id },
      include: { 
        lessonPlans: true,
        classes: true,
        teacher: true
      },
    });

    if (!file) return { success: false, error: 'File not found' };

    // Authorization: Teachers should own the file, students should be enrolled in a class that has this file
    if (session.user.role === "TEACHER") {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher || file.teacherId !== teacher.id) {
        return { success: false, error: 'Forbidden: You do not own this file' };
      }
    } else if (session.user.role === "STUDENT") {
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
        return { success: false, error: 'Forbidden: Not enrolled in any class with this file' };
      }
    }

    return { success: true, data: file };
  } catch (error: any) {
    console.error('Get file error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to get file' };
  }
}

// Get all files for a lessonPlan (Teacher and enrolled Students)
export async function getFiles(lessonPlanId?: string): Promise<FileResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Basic implementation: Get files for a specific lesson plan
    if (!lessonPlanId) {
      return { success: false, error: 'Lesson Plan ID is required for this query' };
    }

    // Verify access to the lesson plan first
    const lessonPlan = await db.lessonPlan.findUnique({
      where: { id: lessonPlanId },
      include: { 
        classes: true,
        teacher: true
      },
    });

    if (!lessonPlan) return { success: false, error: 'Lesson Plan not found' };

    // Authorization check
    if (session.user.role === 'TEACHER') {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher || lessonPlan.teacherId !== teacher.id) {
        return { success: false, error: 'Forbidden: You do not own this lesson plan' };
      }
    } else if (session.user.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.user.id }
      });

      if (!student) {
        return { success: false, error: 'Student profile not found' };
      }

      // Check if student is enrolled in any of the classes this lesson plan belongs to
      const hasAccess = await db.enrollment.findFirst({
        where: {
          studentId: student.id,
          classId: { in: lessonPlan.classes.map(c => c.id) },
          enrolled: true
        }
      });

      if (!hasAccess) {
        return { success: false, error: 'Forbidden: Not enrolled in any class with this lesson plan' };
      }
    }

    const files = await db.file.findMany({
      where: { 
        lessonPlans: { some: { id: lessonPlanId } }
      },
      include: {
        classes: { select: { name: true, code: true } },
        teacher: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'asc' },
    });

    return { success: true, data: files };
  } catch (error: any) {
    console.error('Get files error:', error);
    return { success: false, error: 'Failed to fetch files' };
  }
}

// Update a file by ID using the required fields.
export async function updateFile(id: string, data: FileData): Promise<FileResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized' };
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Verify file exists and belongs to teacher first
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
    
    if (existingFile.teacherId !== teacher.id) {
      return { success: false, error: 'File not found or you do not have permission' };
    }

    // Validate only essential fields, use existing data as fallbacks
    if (!data.name?.trim()) {
      return { success: false, error: 'File name is required' };
    }

    const updatedFile = await db.file.update({
      where: { id },
      data: {
        name: data.name.trim(),
        activity: data.activity || existingFile.activity,
        // Don't update fileType, size, or url as these are set during upload
        // Only update name and activity which are user-editable
      },
      include: { 
        lessonPlans: true,
        classes: true
      },
    });

    // Revalidate paths for all classes this file belongs to
    for (const classObj of existingFile.classes) {
      revalidatePath(`/teacher/dashboard/classes/${classObj.code}`);
    }
    
    return { success: true, data: updatedFile };
  } catch (error: any) {
    console.error('Update file error:', error);
    return { success: false, error: 'Failed to update file: ' + (error?.message || '') };
  }
}

// To assign to other class via lesson plans
interface CopyFileParams {
  sourceFileId: string;
  targetLessonPlanId: string;
  targetClassId: string;
}

export async function copyFileToLessonPlan({
  sourceFileId,
  targetLessonPlanId,
  targetClassId,
}: CopyFileParams): Promise<FileResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized' };
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Verify source file exists and belongs to teacher
    const sourceFile = await db.file.findUnique({
      where: { id: sourceFileId },
      include: { classes: true }
    });

    if (!sourceFile || sourceFile.teacherId !== teacher.id) {
      return { success: false, error: 'Source file not found or you do not have permission' };
    }

    // Verify target class belongs to teacher
    const targetClass = await db.class.findFirst({
      where: { 
        code: targetClassId,
        teacherId: teacher.id
      }
    });
    
    if (!targetClass) {
      return { success: false, error: 'Target class not found or you do not have permission' };
    }
    
    // Verify target lesson plan exists and belongs to teacher
    const targetLessonPlan = await db.lessonPlan.findFirst({
      where: {
        id: targetLessonPlanId,
        teacherId: teacher.id,
        classes: {
          some: {
            code: targetClassId
          }
        }
      }
    });
    
    if (!targetLessonPlan) {
      return { success: false, error: 'Target lesson plan not found in specified class' };
    }

    // Create a new file record with the same details but new connections
    const newFile = await db.file.create({
      data: {
        name: sourceFile.name,
        fileType: sourceFile.fileType,
        activity: sourceFile.activity,
        size: sourceFile.size || 0,
        url: sourceFile.url,
        teacherId: teacher.id,
        classes: {
          connect: { id: targetClass.id }
        },
        lessonPlans: {
          connect: { id: targetLessonPlanId },
        },
      },
      include: { 
        lessonPlans: true,
        classes: true
      },
    });

    revalidatePath(`/teacher/dashboard/classes/${targetClass.code}`);
    return { success: true, data: newFile };
  } catch (error: any) {
    console.error('Copy file error:', error);
    return { success: false, error: 'Failed to copy file to lesson plan: ' + (error?.message || '') };
  }
}

// Delete a file by ID.
export async function deleteFile(id: string): Promise<FileResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized' };
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Verify file exists and belongs to teacher
    const existingFile = await db.file.findUnique({
      where: { id },
      include: { classes: true }
    });
    
    if (!existingFile || existingFile.teacherId !== teacher.id) {
      return { success: false, error: 'File not found or you do not have permission' };
    }

    await db.file.delete({
      where: { id },
    });

    // Revalidate paths for all classes this file belonged to
    for (const classObj of existingFile.classes) {
      revalidatePath(`/teacher/dashboard/classes/${classObj.code}`);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Delete file error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to delete file' };
  }
}