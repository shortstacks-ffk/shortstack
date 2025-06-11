'use server';

import { db } from '@/src/lib/db';
import { getAuthSession } from '@/src/lib/auth';
import { revalidatePath } from 'next/cache';

// Define grade level type for filtering templates
export type GradeLevel = '5-6' | '7-8' | '9-10' | '11-12' | 'all';

interface GenericLessonPlanData {
  name: string;
  description?: string;
  gradeLevel?: string; // Add grade level for templates
}

interface GenericLessonPlanResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface LessonPlanData {
  name: string;
  description?: string;
  gradeLevel?: string;
}

interface LessonPlanResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface LessonPlanClassAssociation {
  lessonPlanId: string;
  classCode: string;
}

// Create a lesson plan directly (without a class)
export async function createLessonPlan(
  data: { name: string; description?: string }
): Promise<LessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized: Teachers only' };
    }
    
    if (!data.name) {
      return { success: false, error: 'Name is required' };
    }

    // Find the teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Create the lesson plan
    const newLessonPlan = await db.lessonPlan.create({
      data: {
        name: data.name,
        description: data.description,
        teacherId: teacher.id,
      },
    });

    revalidatePath('/teacher/dashboard/lesson-plans');
    return { success: true, data: newLessonPlan };
  } catch (error: any) {
    console.error('Create lesson plan error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to create lesson plan' };
  }
}

// Get all lesson plans created by a teacher
export async function getLessonPlans(userId?: string): Promise<LessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized: Teachers only' };
    }

    // Find the teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Get all lesson plans created by this teacher
    const lessonPlans = await db.lessonPlan.findMany({
      where: { teacherId: teacher.id },
      include: {
        classes: {
          select: {
            code: true,
            name: true,
            emoji: true,
            grade: true
          }
        },
        genericLessonPlan: true,
      },
    });

    return { success: true, data: lessonPlans };
  } catch (error: any) {
    console.error('Get lesson plans error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to fetch lesson plans' };
  }
}

// Assign a lesson plan to a class
export async function assignLessonPlanToClass(
  lessonPlanId: string, 
  classCode: string
): Promise<LessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized: Teachers only' };
    }

    // Find the teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Find the lesson plan and verify ownership
    const lessonPlan = await db.lessonPlan.findUnique({
      where: { 
        id: lessonPlanId,
        teacherId: teacher.id 
      }
    });

    if (!lessonPlan) {
      return { success: false, error: 'Lesson plan not found or you do not have permission' };
    }

    // Find the class and verify ownership
    const classObj = await db.class.findUnique({
      where: { 
        code: classCode,
        teacherId: teacher.id 
      }
    });

    if (!classObj) {
      return { success: false, error: 'Class not found or you do not have permission' };
    }

    // Connect the lesson plan to the class
    await db.lessonPlan.update({
      where: { id: lessonPlanId },
      data: {
        classes: {
          connect: { id: classObj.id }
        }
      }
    });

    revalidatePath(`/teacher/dashboard/classes/${classCode}`);
    return { success: true };
  } catch (error: any) {
    console.error('Assign lesson plan error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to assign lesson plan to class' };
  }
}

// Remove a lesson plan from a class
export async function removeLessonPlanFromClass(
  lessonPlanId: string, 
  classCode: string
): Promise<LessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized: Teachers only' };
    }

    // Find the teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Find the lesson plan and verify ownership
    const lessonPlan = await db.lessonPlan.findUnique({
      where: { 
        id: lessonPlanId,
        teacherId: teacher.id 
      }
    });

    if (!lessonPlan) {
      return { success: false, error: 'Lesson plan not found or you do not have permission' };
    }

    // Find the class and verify ownership
    const classObj = await db.class.findUnique({
      where: { 
        code: classCode,
        teacherId: teacher.id 
      }
    });

    if (!classObj) {
      return { success: false, error: 'Class not found or you do not have permission' };
    }

    // Disconnect the lesson plan from the class
    await db.lessonPlan.update({
      where: { id: lessonPlanId },
      data: {
        classes: {
          disconnect: { id: classObj.id }
        }
      }
    });

    revalidatePath(`/teacher/dashboard/classes/${classCode}`);
    return { success: true };
  } catch (error: any) {
    console.error('Remove lesson plan error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to remove lesson plan from class' };
  }
}

// Get all lesson plans for a teacher
export async function getTeacherLessonPlans(): Promise<LessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized' };
    }

    // Find the teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Get all lesson plans created by this teacher
    const lessonPlans = await db.lessonPlan.findMany({
      where: { teacherId: teacher.id },
      include: {
        classes: {
          select: {
            code: true,
            name: true,
            emoji: true,
            grade: true
          }
        },
        files: true,
        assignments: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: lessonPlans };
  } catch (error: any) {
    console.error('Get teacher lesson plans error:', error);
    return { success: false, error: 'Failed to fetch lesson plans' };
  }
}

// Get lesson plans associated with a specific class
export async function getLessonPlansByClass(
  classCode: string
): Promise<LessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Find the class first
    const classObj = await db.class.findUnique({
      where: { code: classCode },
      select: { 
        id: true, 
        teacherId: true,
        code: true,
        grade: true,
        emoji: true, 
        name: true 
      }
    });

    if (!classObj) {
      return { success: false, error: 'Class not found' };
    }

    // If student, check enrollment
    if (session.user.role === "STUDENT") {
      const student = await db.student.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!student) {
        return { success: false, error: 'Student profile not found' };
      }
      
      const enrollment = await db.enrollment.findFirst({
        where: {
          studentId: student.id,
          classId: classObj.id,
          enrolled: true
        }
      });
      
      if (!enrollment) {
        return { success: false, error: 'Not enrolled in this class' };
      }
    } 
    // If teacher, check ownership
    else if (session.user.role === "TEACHER") {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!teacher || teacher.id !== classObj.teacherId) {
        return { success: false, error: 'You do not own this class' };
      }
    }

    // Get all lesson plans associated with this class
    const lessonPlans = await db.lessonPlan.findMany({
      where: {
        classes: {
          some: { code: classCode }
        }
      },
      include: {
        files: true,
        assignments: true,
        genericLessonPlan: {
          select: { name: true, description: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format the response with class info for context
    const result = lessonPlans.map(plan => ({
      ...plan,
      class: {
        code: classObj.code,
        name: classObj.name,
        emoji: classObj.emoji,
        grade: classObj.grade
      }
    }));

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Get class lesson plans error:', error);
    return { success: false, error: 'Failed to fetch lesson plans' };
  }
}

// Get lesson plans available to be added to a class (not already in the class)
export async function getAvailableLessonPlansForClass(
  classCode: string
): Promise<LessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized' };
    }

    // Find the teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Find the class
    const classObj = await db.class.findFirst({
      where: { 
        code: classCode,
        teacherId: teacher.id
      }
    });

    if (!classObj) {
      return { success: false, error: 'Class not found or you do not have permission' };
    }

    // Get all lesson plans created by this teacher that aren't already in this class
    const availablePlans = await db.lessonPlan.findMany({
      where: {
        teacherId: teacher.id,
        classes: {
          none: { code: classCode }
        }
      },
      include: {
        files: {
          select: { id: true }
        },
        assignments: {
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add counts for files and assignments
    const formattedPlans = availablePlans.map(plan => ({
      ...plan,
      fileCount: plan.files.length,
      assignmentCount: plan.assignments.length
    }));

    return { success: true, data: formattedPlans };
  } catch (error: any) {
    console.error('Get available lesson plans error:', error);
    return { success: false, error: 'Failed to fetch available lesson plans' };
  }
}

// Get a single lesson plan by its ID
export async function getLessonPlanByID(planId: string): Promise<LessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER")) {
      return { success: false, error: 'Unauthorized' };
    }

    // First check if this is a regular lesson plan
    const lessonPlan = await db.lessonPlan.findUnique({
      where: { id: planId },
      include: {
        files: true,
        assignments: true,
      },
    });
    
    if (lessonPlan) {
      // For regular lesson plans, verify teacher owns it or is a super user
      if (session.user.role === "SUPER" || 
          (session.user.role === "TEACHER" && 
           await verifyTeacherOwnsLessonPlan(session.user.id, planId))) {
        return { success: true, data: lessonPlan };
      }
      
      return { success: false, error: 'You do not have permission to view this lesson plan' };
    }
    
    // If not found as regular lesson plan, check if it's a template
    const genericLessonPlan = await db.genericLessonPlan.findUnique({
      where: { id: planId },
      include: {
        files: true,
        assignments: true
      },
    });
    
    if (genericLessonPlan) {
      // For templates, allow access to all teachers and SUPER users
      // Add a type indicator to help frontend identify this is a template
      return { 
        success: true, 
        data: {
          ...genericLessonPlan,
          __typename: 'GenericLessonPlan'
        } 
      };
    }
    
    // If not found in either table
    return { success: false, error: 'Lesson plan not found' };
  } catch (error: any) {
    console.error('Get lesson plan error:', error);
    return { success: false, error: 'Failed to fetch lesson plan' };
  }
}

// Update a lesson plan by its ID
export async function updateLessonPlan(
  planId: string, 
  data: { name?: string; description?: string; gradeLevel?: string }
): Promise<LessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized' };
    }

    // Get teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Verify teacher owns the lesson plan
    const lessonPlan = await db.lessonPlan.findFirst({
      where: { 
        id: planId,
        teacherId: teacher.id
      },
      include: {
        classes: {
          select: { code: true }
        }
      }
    });

    if (!lessonPlan) {
      return { success: false, error: 'Lesson plan not found or you do not have permission' };
    }

    // Update the lesson plan
    const updated = await db.lessonPlan.update({
      where: { id: planId },
      data
    });
    
    // Revalidate paths for all associated classes and the lesson plans page
    revalidatePath('/teacher/dashboard/lesson-plans');
    for (const classItem of lessonPlan.classes) {
      revalidatePath(`/teacher/dashboard/classes/${classItem.code}`);
    }
    
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Update lesson plan error:', error);
    return { success: false, error: 'Failed to update lesson plan' };
  }
}

// Delete a lesson plan by its ID
export async function deleteLessonPlan(id: string): Promise<LessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized' };
    }

    // Get teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Verify teacher owns the lesson plan
    const lessonPlan = await db.lessonPlan.findFirst({
      where: { 
        id: id,
        teacherId: teacher.id
      },
      include: {
        classes: { select: { code: true } }
      }
    });

    if (!lessonPlan) {
      return { success: false, error: 'Lesson plan not found or you do not have permission' };
    }

    // Delete the lesson plan
    await db.lessonPlan.delete({ where: { id } });
    
    // Revalidate paths for all associated classes and the lesson plans page
    revalidatePath('/teacher/dashboard/lesson-plans');
    for (const classItem of lessonPlan.classes) {
      revalidatePath(`/teacher/dashboard/classes/${classItem.code}`);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Delete lesson plan error:', error);
    return { success: false, error: 'Failed to delete lesson plan' };
  }
}

// TEMPLATES (GENERIC LESSON PLANS)

// Create a template (generic lesson plan) - for super users only
export async function createGenericLessonPlan(
  data: GenericLessonPlanData
): Promise<GenericLessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "SUPER") {
      return { success: false, error: 'Unauthorized: Only super users can create templates' };
    }
    
    if (!data.name) {
      return { success: false, error: 'Name is required' };
    }

    const newTemplate = await db.genericLessonPlan.create({
      data: {
        name: data.name,
        description: data.description,
        gradeLevel: data.gradeLevel || 'all',
        createdBy: session.user.id
      },
    });

    revalidatePath('/teacher/dashboard/lesson-plans');
    revalidatePath('/super/lesson-templates');
    
    return { success: true, data: newTemplate };
  } catch (error: any) {
    console.error('Create template error:', error);
    return { success: false, error: 'Failed to create template' };
  }
}

// Update a template (generic lesson plan) - for super users only
export async function updateGenericLessonPlan(
  id: string, 
  data: { name?: string; description?: string; gradeLevel?: string }
): Promise<GenericLessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "SUPER") {
      return { success: false, error: 'Unauthorized: Only super users can update templates' };
    }

    // Check if the template exists
    const template = await db.genericLessonPlan.findUnique({
      where: { id }
    });

    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // Update the template
    const updated = await db.genericLessonPlan.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.gradeLevel && { gradeLevel: data.gradeLevel }),
      }
    });

    // Fix: Add the 'page' type parameter to revalidatePath for dynamic routes
    revalidatePath('/teacher/dashboard/lesson-plans', 'page');
    revalidatePath(`/teacher/dashboard/lesson-plans/templates/${id}`, 'page');
    
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Update template error:', error);
    return { success: false, error: 'Failed to update template' };
  }
}

// Delete a template (generic lesson plan) - for super users only
export async function deleteGenericLessonPlan(id: string): Promise<GenericLessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "SUPER") {
      return { success: false, error: 'Unauthorized: Only super users can delete templates' };
    }

    // Check if the template exists
    const template = await db.genericLessonPlan.findUnique({
      where: { id },
      include: { lessonPlans: { select: { id: true } } }
    });

    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // Delete the template
    await db.genericLessonPlan.delete({ where: { id } });
    
    revalidatePath('/teacher/dashboard/lesson-plans');
    revalidatePath('/super/lesson-templates');
    
    return { success: true };
  } catch (error: any) {
    console.error('Delete template error:', error);
    return { success: false, error: 'Failed to delete template' };
  }
}

// Get all templates (generic lesson plans)
export async function getGenericLessonPlans(gradeLevel?: GradeLevel): Promise<GenericLessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Super users and teachers can access templates
    if (session.user.role !== "SUPER" && session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Filter by grade level if provided
    const where = gradeLevel && gradeLevel !== 'all' 
      ? { 
          OR: [
            { gradeLevel: gradeLevel },
            { gradeLevel: 'all' }
          ] 
        }
      : undefined;
    
    const templates = await db.genericLessonPlan.findMany({
      where,
      include: {
        files: true,
        assignments: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return { success: true, data: templates };
  } catch (error: any) {
    console.error('Get templates error:', error);
    return { success: false, error: 'Failed to fetch templates' };
  }
}

// Copy a template to create a teacher lesson plan
export async function copyTemplateToLessonPlan(
  templateId: string,
  data: { name?: string; description?: string }
): Promise<LessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized' };
    }

    // Get teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Find the template with files and assignments
    const template = await db.genericLessonPlan.findUnique({
      where: { id: templateId },
      include: {
        files: true,
        assignments: true
      }
    });

    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // Create a new lesson plan based on the template
    const newLessonPlan = await db.lessonPlan.create({
      data: {
        name: data.name || template.name,
        description: data.description || template.description,
        teacherId: teacher.id,
        genericLessonPlanId: template.id,
      }
    });

    // Initialize arrays for file and assignment operations
    const fileConnections = [];
    const assignmentConnections = [];

    // Copy files if any - create new file records for the teacher to own
    if (template.files && template.files.length > 0) {
      for (const file of template.files) {
        try {
          // Create a new file record based on the template file
          const newFile = await db.file.create({
            data: {
              name: file.name,
              url: file.url,
              size: file.size,
              type: file.type,
              uploadedBy: session.user.id,
              lessonPlanId: newLessonPlan.id
            }
          });
          fileConnections.push({ id: newFile.id });
        } catch (fileError) {
          console.warn('Failed to copy file:', file.name, fileError);
          // Continue with other files even if one fails
        }
      }
    }

    // Copy assignments if any - create new assignment records for the teacher to own
    if (template.assignments && template.assignments.length > 0) {
      for (const assignment of template.assignments) {
        try {
          // Create a new assignment record based on the template assignment
          const newAssignment = await db.assignment.create({
            data: {
              title: assignment.title,
              description: assignment.description,
              dueDate: assignment.dueDate,
              points: assignment.points,
              instructions: assignment.instructions,
              createdBy: session.user.id,
              lessonPlanId: newLessonPlan.id
            }
          });
          assignmentConnections.push({ id: newAssignment.id });
        } catch (assignmentError) {
          console.warn('Failed to copy assignment:', assignment.title, assignmentError);
          // Continue with other assignments even if one fails
        }
      }
    }

    // Get the complete lesson plan with all copied files and assignments
    const completeLessonPlan = await db.lessonPlan.findUnique({
      where: { id: newLessonPlan.id },
      include: {
        files: true,
        assignments: true,
        classes: {
          select: {
            code: true,
            name: true,
            emoji: true,
            grade: true
          }
        }
      }
    });

    revalidatePath('/teacher/dashboard/lesson-plans', 'page');
    return { success: true, data: completeLessonPlan };
  } catch (error: any) {
    console.error('Copy template error:', error);
    return { success: false, error: 'Failed to copy template' };
  }
}

// Updated version for copying a template to a user lesson plan
export async function copyGenericLessonPlanToUser(
  genericLessonPlanId: string,
  customName?: string
): Promise<LessonPlanResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized: Teachers only' };
    }
    
    // Find the teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }
    
    // Verify the generic lesson plan exists
    const genericLessonPlan = await db.genericLessonPlan.findUnique({
      where: { id: genericLessonPlanId },
    });

    if (!genericLessonPlan) {
      return { success: false, error: "Template not found" };
    }

    // Create the new lesson plan
    const newLessonPlan = await db.lessonPlan.create({
      data: {
        name: customName || genericLessonPlan.name,
        description: genericLessonPlan.description,
        teacherId: teacher.id,
        genericLessonPlanId: genericLessonPlan.id,
      },
    });

    revalidatePath('/teacher/dashboard/lesson-plans');
    return { success: true, data: newLessonPlan };
  } catch (error: any) {
    console.error('Copy generic lesson plan error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to create lesson plan from template' };
  }
}

export async function addLessonPlanToClass({
  lessonPlanId,
  classCode
}: LessonPlanClassAssociation): Promise<LessonPlanResponse> {
  return assignLessonPlanToClass(lessonPlanId, classCode);
}

// Rename this function to avoid duplication
export async function removePlanFromClass({
  lessonPlanId,
  classCode
}: LessonPlanClassAssociation): Promise<LessonPlanResponse> {
  return removeLessonPlanFromClass(lessonPlanId, classCode);
}

// Helper function to verify teacher owns a lesson plan
async function verifyTeacherOwnsLessonPlan(userId: string, lessonPlanId: string): Promise<boolean> {
  try {
    const teacher = await db.teacher.findUnique({
      where: { userId },
      select: { id: true }
    });
    
    if (!teacher) return false;
    
    const lessonPlan = await db.lessonPlan.findFirst({
      where: { 
        id: lessonPlanId,
        teacherId: teacher.id
      },
      select: { id: true }
    });
    
    return !!lessonPlan;
  } catch (error) {
    console.error('Error verifying lesson plan ownership:', error);
    return false;
  }
}