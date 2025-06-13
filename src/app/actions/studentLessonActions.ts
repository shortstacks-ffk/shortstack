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
    
    if (!session?.user?.id || session.user.role !== "STUDENT") {
       return { success: false, error: 'Unauthorized: Students only' };
    }

    // Find the student profile ID
    const student = await db.student.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
        ]
      },
      select: { id: true }
    });
    
    if (!student) {
        return { success: false, error: 'Student profile not found' };
    }

    // First, verify the student is enrolled in this class by code
    const enrollment = await db.enrollment.findFirst({
      where: {
        studentId: student.id,
        class: { code: classCode },
        enrolled: true
      },
      select: { classId: true }
    });

    if (!enrollment) {
       return { success: false, error: 'Not enrolled in this class or class not found' };
    }

    // Query lesson plans for this class using many-to-many relationship
    const lessonPlans = await db.lessonPlan.findMany({
      where: { 
        classes: {
          some: {
            id: enrollment.classId
          }
        }
      },
      include: {
        files: true,
        assignments: true // Use assignments directly since it's a many-to-many relation
      },
      orderBy: { createdAt: 'asc' }
    });

    return { success: true, data: lessonPlans };

  } catch (error: any) {
     console.error('Get student lessons error:', error);
     return { success: false, error: 'Failed to fetch lesson plans' };
  }
}

// Get a specific lesson plan for a student
export async function getStudentLessonById(lessonId: string): Promise<LessonResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return { success: false, error: 'Unauthorized' };
    }
    
    console.log(`Student ${session.user.id} requesting lesson ${lessonId}`);
    
    // Find the student profile
    const student = await db.student.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
        ]
      }
    });

    if (!student) {
      return { success: false, error: 'Student profile not found' };
    }
    
    // First, find the lesson plan and check if it exists
    const lessonPlan = await db.lessonPlan.findUnique({
      where: { id: lessonId },
      include: {
        classes: { 
          select: { 
            id: true, 
            code: true, 
            name: true, 
            emoji: true
          } 
        },
      },
    });
    
    if (!lessonPlan) {
      console.log(`Lesson plan ${lessonId} not found`);
      return { success: false, error: 'Lesson plan not found' };
    }
    
    console.log(`Found lesson plan: ${lessonPlan.name}`);
    
    // Check if the student is enrolled in any of the classes this lesson plan belongs to
    const hasAccess = await db.enrollment.findFirst({
      where: {
        studentId: student.id,
        classId: { in: lessonPlan.classes.map(c => c.id) },
        enrolled: true
      }
    });
    
    if (!hasAccess) {
      console.log(`Student ${student.id} is not enrolled in any class with this lesson plan`);
      return { success: false, error: 'You are not enrolled in any class with this lesson plan' };
    }
    
    // Fetch the full lesson data with files and assignments
    const fullLessonData = await db.lessonPlan.findUnique({
      where: { id: lessonId },
      include: {
        classes: { 
          select: { 
            id: true, 
            code: true, 
            name: true, 
            emoji: true
          } 
        },
        files: true,
        assignments: true // Use assignments directly since it's a many-to-many relation
      }
    });
    
    if (!fullLessonData) {
      return { success: false, error: 'Lesson data not found' };
    }
    
    console.log(`Successfully retrieved lesson data for student ${student.id}`);
    return { success: true, data: fullLessonData };
  } catch (error) {
    console.error('Error fetching student lesson:', error);
    return { success: false, error: 'Failed to fetch lesson data' };
  }
}