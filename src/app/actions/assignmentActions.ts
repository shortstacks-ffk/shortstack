'use server';

import { db } from '@/src/lib/db';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

interface AssignmentData {
  name: string;
  description?: string;
  dueDate?: Date;
  lessonPlanIds?: string[];
}

interface AssignmentResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Create
export async function createAssignment(data: AssignmentData): Promise<AssignmentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!data.name) {
      return { success: false, error: 'Assignment name is required' };
    }

    const createdAssignment = await db.assignment.create({
      data: {
        name: data.name,
        description: data.description,
        dueDate: data.dueDate,
        lessonPlans: data.lessonPlanIds
          ? {
              connect: data.lessonPlanIds.map((lpId) => ({ id: lpId })),
            }
          : undefined,
      },
    });

    revalidatePath('/dashboard/classes');
    return { success: true, data: createdAssignment };
  } catch (error: any) {
    console.error('Create assignment error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to create assignment' };
  }
}

// Get single assignment
export async function getAssignmentByID(id: string): Promise<AssignmentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const assignment = await db.assignment.findUnique({
      where: { id },
      include: { lessonPlans: true },
    });

    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    return { success: true, data: assignment };
  } catch (error: any) {
    console.error('Get assignment error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to get assignment' };
  }
}

// Get all assignments
export async function getAssignments(): Promise<AssignmentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const assignments = await db.assignment.findMany({
      include: { lessonPlans: true },
    });
    return { success: true, data: assignments };
  } catch (error: any) {
    console.error('Get assignments error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to get assignments' };
  }
}

// Update
export async function updateAssignment(
  id: string,
  data: Partial<AssignmentData>
): Promise<AssignmentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const updatedAssignment = await db.assignment.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        dueDate: data.dueDate,
        lessonPlans: data.lessonPlanIds
          ? {
              set: data.lessonPlanIds.map((lpId) => ({ id: lpId })),
            }
          : undefined,
      },
      include: { lessonPlans: true },
    });

    revalidatePath('/dashboard/classes');
    return { success: true, data: updatedAssignment };
  } catch (error: any) {
    console.error('Update assignment error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to update assignment' };
  }
}

// Delete
export async function deleteAssignment(id: string): Promise<AssignmentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await db.assignment.delete({
      where: { id },
    });

    revalidatePath('/dashboard/classes');
    return { success: true };
  } catch (error: any) {
    console.error('Delete assignment error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to delete assignment' };
  }
}
