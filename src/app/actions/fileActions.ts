'use server';

import { db } from '@/src/lib/db';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

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
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    if (!data.name || !data.fileType || !data.url || !data.size || !data.classId) {
      return { success: false, error: 'Missing required fields' };
    }

    const createdFile = await db.file.create({
      data: {
        name: data.name,
        fileType: data.fileType,
        activity: data.activity,
        size: data.size,
        url: data.url,
        classId: data.classId,
        lessonPlans: data.lessonPlanIds
          ? {
              connect: data.lessonPlanIds.map((id) => ({ id })),
            }
          : undefined,
      },
    });

    revalidatePath('/dashboard/classes');
    return { success: true, data: createdFile };
  } catch (error: any) {
    console.error('Create file error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to create file' };
  }
}

// Get a single file by ID including its related lesson plans.
export async function getFileByID(id: string): Promise<FileResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const file = await db.file.findUnique({
      where: { id },
      include: { lessonPlans: true },
    });

    if (!file) return { success: false, error: 'File not found' };

    return { success: true, data: file };
  } catch (error: any) {
    console.error('Get file error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to get file' };
  }
}

// Get all files and include their associated lesson plans.
export async function getFiles(): Promise<FileResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const files = await db.file.findMany({
      include: { lessonPlans: true },
    });

    return { success: true, data: files };
  } catch (error: any) {
    console.error('Get files error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to get files' };
  }
}

// Update a file by ID using the required fields.
// Update a file by ID using the required fields.
export async function updateFile(id: string, data: FileData): Promise<FileResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    if (!data.name || !data.fileType || !data.url || !data.size || !data.classId) {
      return { success: false, error: 'Missing required fields' };
    }

    const updatedFile = await db.file.update({
      where: { id },
      data: {
        name: data.name,
        fileType: data.fileType,
        activity: data.activity,
        size: data.size,
        url: data.url,
        classId: data.classId,
        lessonPlans: data.lessonPlanIds
          ? {
              set: data.lessonPlanIds.map((lpId) => ({ id: lpId })),
            }
          : undefined,
      },
      include: { lessonPlans: true },
    });

    revalidatePath('/dashboard/classes');
    return { success: true, data: updatedFile };
  } catch (error: any) {
    console.error('Update file error:', error);
    return { success: false, error: 'Failed to update file' };
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
  targetClassId
}: CopyFileParams): Promise<FileResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    // Get the source file
    const sourceFile = await db.file.findUnique({
      where: { id: sourceFileId }
    });

    if (!sourceFile) {
      return { success: false, error: 'Source file not found' };
    }

    // Create a new file record with the same details but new connections
    const newFile = await db.file.create({
      data: {
        name: sourceFile.name,
        fileType: sourceFile.fileType,
        activity: sourceFile.activity,
        size: sourceFile.size,
        url: sourceFile.url,
        classId: targetClassId,
        lessonPlans: {
          connect: { id: targetLessonPlanId }
        }
      },
      include: { lessonPlans: true },
    });

    revalidatePath('/dashboard/classes');
    return { success: true, data: newFile };
  } catch (error: any) {
    console.error('Copy file error:', error);
    return { success: false, error: 'Failed to copy file to lesson plan' };
  }
}


// Delete a file by ID.
export async function deleteFile(id: string): Promise<FileResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    await db.file.delete({
      where: { id },
    });

    revalidatePath('/dashboard/classes');
    return { success: true };
  } catch (error: any) {
    console.error('Delete file error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to delete file' };
  }
}