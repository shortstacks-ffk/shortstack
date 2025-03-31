'use server';

import { db } from '@/src/lib/db';
import { getAuthSession } from '@/src/lib/auth';

interface LessonResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Get all lesson plans for a student in a specific class
export async function getStudentLessonsByClass(classCode: string): Promise<LessonResponse> {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id || session.user.role !== "student") {
      return { success: false, error: 'Unauthorized' };
    }
    
    const studentId = session.user.id;
    
    // First, verify the student is enrolled in this class
    const enrollment = await db.enrollment.findFirst({
      where: {
        studentId,
        class: { code: classCode },
        enrolled: true
      }
    });
    
    if (!enrollment) {
      return { success: false, error: 'Not enrolled in this class' };
    }
    
    // Query lesson plans for this class
    const lessonPlans = await db.lessonPlan.findMany({
      where: { class: { code: classCode } },
      include: {
        files: true,
        assignments: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return { success: true, data: lessonPlans };
  } catch (error: any) {
    console.error('Get student lessons error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to fetch lessons' };
  }
}

// Get a specific lesson plan for a student
export async function getStudentLessonById(lessonId: string): Promise<LessonResponse> {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id || session.user.role !== "student") {
      return { success: false, error: 'Unauthorized' };
    }
    
    const studentId = session.user.id;
    
    // Get the lesson plan with verification that student is enrolled in the related class
    const lessonPlan = await db.lessonPlan.findFirst({
      where: {
        id: lessonId,
        class: {
          enrollments: {
            some: {
              studentId,
              enrolled: true
            }
          }
        }
      },
      include: {
        files: true,
        assignments: true,
        class: {
          select: {
            name: true,
            code: true,
            emoji: true
          }
        }
      }
    });
    
    if (!lessonPlan) {
      return { success: false, error: 'Lesson not found or not accessible' };
    }
    
    return { success: true, data: lessonPlan };
  } catch (error: any) {
    console.error('Get student lesson error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to fetch lesson' };
  }
}