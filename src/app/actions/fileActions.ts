'use server';

import { db } from '@/src/lib/db';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

interface FileData {
  name: string;
  description?: string;
  url?: string;
  // Optionally associate with lessonPlans
  lessonPlanIds?: string[];
}

interface FileResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Create
export async function createFile(data: FileData): Promise<FileResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!data.name) {
      return { success: false, error: 'File name is required' };
    }

    const createdFile = await db.file.create({
      data: {
        name: data.name,
        description: data.description,
        url: data.url,
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

// Get single file
export async function getFileByID(id: string): Promise<FileResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const file = await db.file.findUnique({
      where: { id },
      include: { lessonPlans: true },
    });

    if (!file) {
      return { success: false, error: 'File not found' };
    }

    return { success: true, data: file };
  } catch (error: any) {
    console.error('Get file error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to get file' };
  }
}

// Get all files
export async function getFiles(): Promise<FileResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const files = await db.file.findMany({
      include: { lessonPlans: true },
    });
    return { success: true, data: files };
  } catch (error: any) {
    console.error('Get files error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to get files' };
  }
}

// Update
export async function updateFile(id: string, data: FileData): Promise<FileResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const updatedFile = await db.file.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        url: data.url,
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
    console.error('Update file error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to update file' };
  }
}

// Delete
export async function deleteFile(id: string): Promise<FileResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

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
