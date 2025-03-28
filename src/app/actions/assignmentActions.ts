'use server';

import { db } from '@/src/lib/db';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

interface AssignmentData {
  name: string;
  activity?: string;
  dueDate?: Date;
  classId: string;
  lessonPlanIds?: string[];
  url?: string;       // Added for file URL
  fileType?: string;  // Added for file type
  size?: number;      // Added for file size
}

interface AssignmentResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Create an assignment using the required fields.
export async function createAssignment(data: AssignmentData): Promise<AssignmentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    if (!data.name || !data.classId) {
      return { success: false, error: 'Missing required fields' };
    }

    const createdAssignment = await db.assignment.create({
      data: {
        name: data.name,
        activity: data.activity,
        dueDate: data.dueDate,
        classId: data.classId,
        url: data.url,
        fileType: data.fileType || '',
        size: data.size || 0,
        lessonPlans: data.lessonPlanIds
          ? {
              connect: data.lessonPlanIds.map((id) => ({ id })),
            }
          : undefined,
      } as any,
    });

    revalidatePath('/dashboard/classes');
    return { success: true, data: createdAssignment };
  } catch (error: any) {
    console.error('Create assignment error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to create assignment' };
  }
}

// Get a single assignment by ID including its related lesson plans.
export async function getAssignmentByID(id: string): Promise<AssignmentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const assignment = await db.assignment.findUnique({
      where: { id },
      include: { lessonPlans: true },
    });

    if (!assignment) return { success: false, error: 'Assignment not found' };

    return { success: true, data: assignment };
  } catch (error: any) {
    console.error('Get assignment error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to get assignment' };
  }
}

// Get all assignments and include their associated lesson plans.
export async function getAssignments(): Promise<AssignmentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const assignments = await db.assignment.findMany({
      include: { lessonPlans: true },
    });

    return { success: true, data: assignments };
  } catch (error: any) {
    console.error('Get assignments error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to get assignments' };
  }
}

// Update an assignment by ID using the required fields.
export async function updateAssignment(id: string, data: AssignmentData): Promise<AssignmentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    if (!data.name || !data.classId) {
      return { success: false, error: 'Missing required fields' };
    }

    const updatedAssignment = await db.assignment.update({
      where: { id },
      data: {
        name: data.name,
        activity: data.activity,
        dueDate: data.dueDate,
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
    return { success: true, data: updatedAssignment };
  } catch (error: any) {
    console.error('Update assignment error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to update assignment' };
  }
}

// Copy an assignment to another class via lesson plans.
interface CopyAssignmentParams {
  sourceAssignmentId: string;
  targetLessonPlanId: string;
  targetClassId: string;
}

export async function copyAssignmentToLessonPlan({
  sourceAssignmentId,
  targetLessonPlanId,
  targetClassId,
}: CopyAssignmentParams): Promise<AssignmentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const sourceAssignment = await db.assignment.findUnique({
      where: { id: sourceAssignmentId },
    });

    if (!sourceAssignment) {
      return { success: false, error: 'Source assignment not found' };
    }

    const newAssignment = await db.assignment.create({
      data: {
        name: sourceAssignment.name,
        activity: sourceAssignment.activity,
        dueDate: sourceAssignment.dueDate,
        classId: targetClassId,
        lessonPlans: {
          connect: { id: targetLessonPlanId },
        },
        fileType: 'unknown',
        size: 0,
      },
      include: { lessonPlans: true },
    });

    revalidatePath('/dashboard/classes');
    return { success: true, data: newAssignment };
  } catch (error: any) {
    console.error('Copy assignment error:', error);
    return { success: false, error: 'Failed to copy assignment to lesson plan' };
  }
}

// Delete an assignment by ID.
export async function deleteAssignment(id: string): Promise<AssignmentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

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