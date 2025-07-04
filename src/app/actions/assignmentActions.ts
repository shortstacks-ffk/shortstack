'use server';

import { db } from "@/src/lib/db";
import { getAuthSession } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from '@prisma/client';
import { del } from '@vercel/blob';

// Type definitions
interface AssignmentData {
  name: string;
  activity?: string;
  dueDate?: string | Date;
  lessonPlanIds: string[]; // Changed: now required instead of classId
  url?: string;
  fileType?: string;
  size?: number;
  textAssignment?: string;
  description?: string;
}

interface CopyAssignmentParams {
  sourceAssignmentId: string;
  targetLessonPlanId: string;
}

interface GradeSubmissionParams {
  submissionId: string;
  grade: number;
  feedback?: string;
}

interface AssignmentResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Add calendar events for an assignment
async function createAssignmentCalendarEvents(assignment: any, lessonPlan: any): Promise<void> {
  // First, check if calendar events already exist for this assignment
  const existingEvents = await db.calendarEvent.findMany({
    where: {
      assignmentId: assignment.id
    }
  });

  // If events already exist, don't create more
  if (existingEvents.length > 0) {
    console.log(`Calendar events already exist for assignment ${assignment.id}. Skipping creation.`);
    return;
  }

  // Get all classes that have this lesson plan
  const classesWithLessonPlan = await db.class.findMany({
    where: {
      lessonPlans: {
        some: {
          id: lessonPlan.id
        }
      }
    }
  });

  for (const classObj of classesWithLessonPlan) {
    // Use the due date as-is since it's already in UTC with the correct date
    const dueDate = new Date(assignment.dueDate);
    
    // Create end date 1 hour after start date
    const endDate = new Date(dueDate);
    endDate.setHours(endDate.getHours() + 1);
    
    // Create main calendar event for the class
    await db.calendarEvent.create({
      data: {
        title: `Assignment Due: ${assignment.name}`,
        description: assignment.activity || 'Assignment due',
        startDate: dueDate,
        endDate: endDate,
        isRecurring: false,
        createdById: classObj.teacherId,
        assignmentId: assignment.id,
        classId: classObj.id,
        variant: "warning",
        metadata: {
          type: "assignment",
          dueTime: "8:00 PM",
          dueDate: dueDate.toISOString()
        }
      }
    });
  }
}

// Create an assignment using lesson plans
export async function createAssignment(data: AssignmentData): Promise<AssignmentResponse> {
  try {
    console.log("Starting assignment creation...");
    const session = await getAuthSession();
    if (!session?.user?.id || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER')) {
      return { success: false, error: 'Unauthorized: Only teachers can create assignments' };
    }
    
    // Find the teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }
    
    // Verify the teacher has access to all the specified lesson plans
    if (!data.lessonPlanIds || data.lessonPlanIds.length === 0) {
      return { success: false, error: 'At least one lesson plan ID is required' };
    }
    
    // Check if the lesson plans exist and belong to the teacher
    const lessonPlans = await db.lessonPlan.findMany({
      where: {
        id: { in: data.lessonPlanIds },
        teacherId: teacher.id, // This checks if the teacher owns the lesson plan
      },
      include: {
        classes: true // Include classes to use for revalidation
      }
    });
    
    if (lessonPlans.length !== data.lessonPlanIds.length) {
      return { success: false, error: 'Some lesson plans not found or you do not have permission' };
    }

    // Fix the date handling - store the assignment due at the user's intended time
    let dueDate: Date | undefined;
    if (data.dueDate) {
      if (typeof data.dueDate === 'string') {
        const [year, month, day] = data.dueDate.split('-').map(Number);
        // create a UTC instant at 20:00 local‐equivalent with no shift
        dueDate = new Date(Date.UTC(year, month - 1, day, 20, 0, 0, 0));
      } else {
        dueDate = new Date(data.dueDate);
        // likewise shift into UTC slot 20:00
        dueDate = new Date(Date.UTC(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate(),
          20, 0, 0
        ));
      }
      console.log('Assignment due date set to:', dueDate.toISOString());
    }
    
    // Create assignment connected to lesson plans
    const createdAssignment = await db.assignment.create({
      data: {
        name: data.name,
        activity: data.activity,
        dueDate: dueDate,
        teacherId: teacher.id,
        url: data.url || '', 
        fileType: data.fileType || '',
        size: data.size || 0,
        textAssignment: data.textAssignment,
        description: data.description,
        lessonPlans: {
          connect: data.lessonPlanIds.map((id) => ({ id }))
        }
      },
      include: {
        lessonPlans: {
          include: {
            classes: true
          }
        }
      }
    });

    console.log('Assignment created successfully:', createdAssignment.id);
    console.log('Saved due date:', createdAssignment.dueDate?.toISOString());
    
    // IMPORTANT: Create visibility records with explicit visibleToStudents: false
    const allClasses = createdAssignment.lessonPlans.flatMap(lp => lp.classes || []);

    if (allClasses.length > 0) {
      console.log(`Creating visibility settings for ${allClasses.length} classes`);
      
      for (const classObj of allClasses) {
        await db.classContentVisibility.create({
          data: {
            classId: classObj.id,
            assignmentId: createdAssignment.id,
            visibleToStudents: false,
            dueDate: dueDate
          }
        });
        console.log(`Created visibility record for assignment ${createdAssignment.id} in class ${classObj.id}`);
      }
    } else {
      console.log('No classes assigned to lesson plans yet. Will prompt for class assignment when making visible.');
    }
    
    // Create calendar events for the assignment if due date is set
    if (dueDate) {
      for (const lessonPlan of lessonPlans) {
        await createAssignmentCalendarEvents(createdAssignment, lessonPlan);
      }
      console.log('Calendar events created for assignment');
    }
    
    // Always revalidate lesson plan pages
    revalidatePath('/teacher/dashboard/lesson-plans', 'page');
    
    // Revalidate specific lesson plan detail pages
    for (const lp of lessonPlans) {
      revalidatePath(`/teacher/dashboard/lesson-plans/${lp.id}`, 'page');
    }
    
    // Revalidate class-specific pages only if classes exist
    const allClassesForReval = lessonPlans.flatMap(lp => lp.classes || []);
    if (allClassesForReval.length > 0) {
      console.log(`Revalidating paths for ${allClassesForReval.length} classes`);
      
      for (const classObj of allClassesForReval) {
        if (classObj && classObj.code) {
          // Class dashboard and class lesson plans list
          revalidatePath(`/teacher/dashboard/classes/${classObj.code}`, 'page');
          revalidatePath(`/teacher/dashboard/classes/${classObj.code}/lesson-plans`, 'page');
          
          // Class-specific lesson plan detail pages
          for (const lp of lessonPlans) {
            revalidatePath(`/teacher/dashboard/classes/${classObj.code}/lesson-plans/${lp.id}`, 'page');
          }
        }
      }
    }
    
    return { success: true, data: createdAssignment };
  } catch (error: any) {
    console.error("Create assignment error:", error);
    return { success: false, error: error.message };
  }
}

// Get a single assignment by ID including its related lesson plans
export async function getAssignmentByID(id: string): Promise<AssignmentResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const assignment = await db.assignment.findUnique({
      where: { id },
      include: { 
        lessonPlans: {
          include: {
            classes: true
          }
        },
        teacher: true
      },
    });

    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }
    
    // Authorization check
    if (session.user.role === "TEACHER") {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!teacher || assignment.teacherId !== teacher.id) {
        return { success: false, error: 'Forbidden: You do not own this assignment' };
      }
    } else if (session.user.role === "STUDENT") {
      // Check if student is enrolled in any of the classes this assignment belongs to through lesson plans
      const student = await db.student.findFirst({
        where: { userId: session.user.id }
      });

      if (!student) {
        return { success: false, error: 'Student profile not found' };
      }

      const allClasses = assignment.lessonPlans.flatMap(lp => lp.classes);
      const hasAccess = await db.enrollment.findFirst({
        where: {
          studentId: student.id,
          classId: { in: allClasses.map(c => c.id) },
          enrolled: true
        }
      });

      if (!hasAccess) {
        return { success: false, error: 'Forbidden: Not enrolled in any class with this assignment' };
      }
    }

    return { success: true, data: assignment };
  } catch (error: any) {
    console.error('Get assignment error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to get assignment' };
  }
}

// Get all assignments for a class or user
export async function getAssignments(classId?: string): Promise<AssignmentResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }
    
    let whereClause: Prisma.AssignmentWhereInput = {};
    
    if (session.user.role === "TEACHER") {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher) {
        return { success: false, error: 'Teacher profile not found' };
      }

      if (classId) {
        // Get assignments for specific class through lesson plans
        const classObj = await db.class.findFirst({
          where: {
            code: classId,
            teacherId: teacher.id
          }
        });

        if (!classObj) {
          return { success: false, error: 'Class not found or you do not have permission' };
        }

        whereClause = {
          teacherId: teacher.id,
          lessonPlans: {
            some: {
              classes: {
                some: {
                  id: classObj.id
                }
              }
            }
          }
        };
      } else {
        // Get all assignments for this teacher
        whereClause = {
          teacherId: teacher.id
        };
      }
    } else if (session.user.role === "STUDENT") {
      const student = await db.student.findFirst({
        where: { userId: session.user.id }
      });

      if (!student) {
        return { success: false, error: 'Student profile not found' };
      }

      if (classId) {
        // Check if student is enrolled in this specific class
        const classObj = await db.class.findFirst({
          where: { code: classId }
        });

        if (!classObj) {
          return { success: false, error: 'Class not found' };
        }

        const enrollment = await db.enrollment.findFirst({
          where: {
            studentId: student.id,
            classId: classObj.id,
            enrolled: true
          }
        });
        
        if (!enrollment) {
          return { success: false, error: 'Forbidden: Not enrolled in this class' };
        }

        whereClause = {
          lessonPlans: {
            some: {
              classes: {
                some: {
                  id: classObj.id
                }
              }
            }
          }
        };
      } else {
        // Get assignments for all classes the student is enrolled in
        const enrollments = await db.enrollment.findMany({
          where: {
            studentId: student.id,
            enrolled: true
          },
          select: { classId: true }
        });
        
        const classIds = enrollments.map(e => e.classId);
        
        whereClause = {
          lessonPlans: {
            some: {
              classes: {
                some: {
                  id: { in: classIds }
                }
              }
            }
          }
        };
      }
    }

    const assignments = await db.assignment.findMany({
      where: whereClause,
      include: { 
        lessonPlans: {
          include: {
            classes: { select: { name: true, code: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: assignments };
  } catch (error: any) {
    console.error('Get assignments error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to get assignments' };
  }
}

// Update an assignment by ID using lesson plans
export async function updateAssignment(id: string, data: AssignmentData): Promise<AssignmentResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER" && session.user.role !== "SUPER") {
      return { success: false, error: 'Unauthorized' };
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    const existingAssignment = await db.assignment.findUnique({
      where: { id },
      include: { 
        lessonPlans: {
          include: {
            classes: true
          }
        },
        teacher: true
      }
    });
    
    if (!existingAssignment || existingAssignment.teacherId !== teacher.id) {
      return { success: false, error: 'Assignment not found or you do not have permission' };
    }

    if (!data.name) {
      return { success: false, error: 'Missing required fields' };
    }

    // Fix the date handling for updates - create the date in UTC to prevent timezone shift
    let dueDate = null;
    if (data.dueDate) {
      if (typeof data.dueDate === 'string') {
        // Parse the date string and create a date that represents 8PM in the user's local timezone
        const [year, month, day] = data.dueDate.split('-').map(Number);
        // Create date in local timezone at 8PM (20:00)
        dueDate = new Date(year, month - 1, day, 20, 0, 0, 0);
      } else {
        dueDate = new Date(data.dueDate);
        // Set to 8PM in local timezone
        dueDate.setHours(20, 0, 0, 0);
      }
      console.log('Assignment due date updated to:', dueDate.toISOString());
      console.log('Assignment due date local representation:', dueDate.toString());
    }

    const updatedAssignment = await db.assignment.update({
      where: { id },
      data: {
        name: data.name,
        activity: data.activity,
        dueDate: dueDate,
        textAssignment: data.textAssignment,
        description: data.description,
        lessonPlans: data.lessonPlanIds
          ? {
              set: data.lessonPlanIds.map((lpId) => ({ id: lpId })),
            }
          : undefined,
      },
      include: {
        lessonPlans: {
          include: {
            classes: true
          }
        },
      },
    });

    // If lesson plan connections changed, update visibility settings
    if (data.lessonPlanIds && existingAssignment.lessonPlans) {
      // Get all previous and new classes
      const previousClassIds = existingAssignment.lessonPlans.flatMap(lp => lp.classes.map(c => c.id));
      const newClassIds = updatedAssignment.lessonPlans.flatMap(lp => lp.classes.map(c => c.id));
      
      // Find classes that are no longer connected
      const removedClassIds = previousClassIds.filter(id => !newClassIds.includes(id));
      
      // Find newly added classes
      const addedClassIds = newClassIds.filter(id => !previousClassIds.includes(id));
      
      // Remove visibility settings for removed classes
      if (removedClassIds.length > 0) {
        await db.classContentVisibility.deleteMany({
          where: {
            assignmentId: id,
            classId: { in: removedClassIds }
          }
        });
      }
      
      // Create visibility settings for new classes
      for (const classId of addedClassIds) {
        await db.classContentVisibility.create({
          data: {
            classId,
            assignmentId: id,
            visibleToStudents: false,
            dueDate: dueDate // Use the same due date initially
          }
        });
      }
    }
    
    // If due date changed, update all class visibility settings with the new date
    // but only if they don't have custom due dates already set
    if (data.dueDate && existingAssignment.dueDate?.toISOString() !== dueDate?.toISOString()) {
      // Get all visibility settings for this assignment that don't have a custom due date
      // (those that match the assignment's original due date)
      const visibilitySettings = await db.classContentVisibility.findMany({
        where: {
          assignmentId: id,
          dueDate: existingAssignment.dueDate
        }
      });
      
      // Update these to use the new due date
      for (const setting of visibilitySettings) {
        await db.classContentVisibility.update({
          where: { id: setting.id },
          data: { dueDate }
        });
      }
    }
    
    // Update calendar events if due date changed
    if (data.dueDate && existingAssignment.dueDate?.toISOString() !== dueDate?.toISOString()) {
      await db.calendarEvent.deleteMany({
        where: { assignmentId: id }
      });
      
      for (const lessonPlan of updatedAssignment.lessonPlans) {
        await createAssignmentCalendarEvents(updatedAssignment, lessonPlan);
      }
    }

    // Revalidate lesson plan pages
    revalidatePath('/teacher/dashboard/lesson-plans', 'page');
    for (const lp of updatedAssignment.lessonPlans) {
      revalidatePath(`/teacher/dashboard/lesson-plans/${lp.id}`, 'page');
    }

    // Revalidate class-specific pages when applicable
    const allClasses = updatedAssignment.lessonPlans.flatMap(lp => lp.classes || []);
    if (allClasses.length > 0) {
      for (const classObj of allClasses) {
        if (classObj && classObj.code) {
          revalidatePath(`/teacher/dashboard/classes/${classObj.code}`, 'page');
          revalidatePath(`/teacher/dashboard/classes/${classObj.code}/lesson-plans`, 'page');
          
          for (const lp of updatedAssignment.lessonPlans) {
            revalidatePath(`/teacher/dashboard/classes/${classObj.code}/lesson-plans/${lp.id}`, 'page');
          }
        }
      }
    }
    
    return { success: true, data: updatedAssignment };
  } catch (error: any) {
    console.error('Update assignment error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to update assignment' };
  }
}

// Copy an assignment to another lesson plan
export async function copyAssignmentToLessonPlan({
  sourceAssignmentId,
  targetLessonPlanId,
}: CopyAssignmentParams): Promise<AssignmentResponse> {
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

    // Verify source assignment exists and belongs to teacher
    const sourceAssignment = await db.assignment.findUnique({
      where: { id: sourceAssignmentId },
      include: { 
        lessonPlans: {
          include: {
            classes: true
          }
        }
      }
    });

    if (!sourceAssignment || sourceAssignment.teacherId !== teacher.id) {
      return { success: false, error: 'Source assignment not found or you do not have permission' };
    }
    
    // Verify target lesson plan exists and belongs to teacher
    const targetLessonPlan = await db.lessonPlan.findFirst({
      where: {
        id: targetLessonPlanId,
        classes: {
          some: {
            teacherId: teacher.id
          }
        }
      },
      include: {
        classes: true
      }
    });
    
    if (!targetLessonPlan) {
      return { success: false, error: 'Target lesson plan not found or you do not have permission' };
    }

    const newAssignment = await db.assignment.create({
      data: {
        name: sourceAssignment.name,
        activity: sourceAssignment.activity,
        dueDate: sourceAssignment.dueDate,
        teacherId: teacher.id,
        fileType: sourceAssignment.fileType || 'unknown',
        size: sourceAssignment.size || 0,
        url: sourceAssignment.url || '',
        description: sourceAssignment.description,
        textAssignment: sourceAssignment.textAssignment,
        lessonPlans: {
          connect: { id: targetLessonPlanId },
        },
      },
      include: {
        lessonPlans: {
          include: {
            classes: true
          }
        }
      },
    });

    // Create default visibility settings for classes
    const allClasses = targetLessonPlan.classes || [];
    for (const classObj of allClasses) {
      await db.classContentVisibility.create({
        data: {
          classId: classObj.id,
          assignmentId: newAssignment.id,
          visibleToStudents: false,
          dueDate: newAssignment.dueDate // Use the same due date initially
        }
      });
    }

    // Create calendar events for this assignment if it has a due date
    if (newAssignment.dueDate) {
      await createAssignmentCalendarEvents(newAssignment, targetLessonPlan);
    }

    // Revalidate paths for all affected classes
    for (const classObj of targetLessonPlan.classes) {
      revalidatePath(`/teacher/dashboard/classes/${classObj.code}`);
    }
    
    return { success: true, data: newAssignment };
  } catch (error: any) {
    console.error('Copy assignment error:', error);
    return { success: false, error: 'Failed to copy assignment to lesson plan: ' + (error?.message || '') };
  }
}

// Delete an assignment by ID
export async function deleteAssignment(id: string): Promise<AssignmentResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const isSuperUser = session.user.role === "SUPER";

    // Fetch the assignment with both regular and generic lesson plan relationships
    const existingAssignment = await db.assignment.findUnique({
      where: { id },
      include: { 
        lessonPlans: {
          include: {
            classes: true
          }
        },
        GenericLessonPlan: true
      }
    });
    
    if (!existingAssignment) {
      return { success: false, error: 'Assignment not found' };
    }
    
    // Handle authorization differently based on user role
    if (session.user.role === "TEACHER") {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher || existingAssignment.teacherId !== teacher.id) {
        return { success: false, error: 'You do not have permission to delete this assignment' };
      }
    } else if (session.user.role === "SUPER") {
      // Super users can delete assignments from generic lesson plans
      if (!existingAssignment.GenericLessonPlan) {
        // If it's not in a generic lesson plan, check if the super user created it
        const teacher = await db.teacher.findUnique({
          where: { userId: session.user.id }
        });
        
        if (!teacher || existingAssignment.teacherId !== teacher.id) {
          return { success: false, error: 'You do not have permission to delete this assignment' };
        }
      }
    } else {
      return { success: false, error: 'Unauthorized' };
    }

    // Check for file URL in the assignment to delete from blob storage
    let blobDeleteResult = { attempted: false, success: false };
    if (existingAssignment.url) {
      try {
        blobDeleteResult.attempted = true;
        console.log(`Attempting to delete assignment file from blob: ${existingAssignment.url}`);
        
        // Extract the blob path from the URL
        const urlObj = new URL(existingAssignment.url);
        const pathname = urlObj.pathname;
        // The pathname typically starts with a leading slash that we need to remove
        const blobPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
        
        if (!blobPath) {
          console.error("Invalid blob path extracted from URL:", existingAssignment.url);
        } else {
          console.log(`Deleting assignment blob at path: ${blobPath}`);
          await del(blobPath);
          console.log("Assignment blob deleted successfully");
          blobDeleteResult.success = true;
        }
      } catch (blobError) {
        console.error('Failed to delete assignment file from blob storage:', blobError);
        // Continue with database deletion even if blob deletion fails
      }
    }

    // Now check for student submissions that might have files to clean up
    const studentSubmissions = await db.studentAssignmentSubmission.findMany({
      where: { assignmentId: id },
      select: { id: true, fileUrl: true }
    });
    
    const submissionBlobResults = [];
    
    // Try to delete each submission's file from blob storage
    for (const submission of studentSubmissions) {
      if (submission.fileUrl) {
        try {
          console.log(`Attempting to delete submission file from blob: ${submission.fileUrl}`);
          
          // Extract the blob path from the URL
          const urlObj = new URL(submission.fileUrl);
          const pathname = urlObj.pathname;
          const blobPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
          
          if (blobPath) {
            console.log(`Deleting submission blob at path: ${blobPath}`);
            await del(blobPath);
            console.log(`Submission blob deleted successfully for submission ${submission.id}`);
            submissionBlobResults.push({ id: submission.id, deleted: true });
          }
        } catch (submissionBlobError) {
          console.error(`Failed to delete submission ${submission.id} file from blob:`, submissionBlobError);
          submissionBlobResults.push({ id: submission.id, deleted: false });
        }
      }
    }

    // Delete associated calendar events
    await db.calendarEvent.deleteMany({
      where: { assignmentId: id }
    });
    
    // Delete visibility settings
    await db.classContentVisibility.deleteMany({
      where: { assignmentId: id }
    });

    // Delete associated student submissions
    await db.studentAssignmentSubmission.deleteMany({
      where: { assignmentId: id }
    });

    // Delete the assignment
    await db.assignment.delete({ where: { id } });
    
    // Revalidate paths based on whether it's a generic lesson plan or not
    if (existingAssignment.GenericLessonPlan) {
      if ('id' in existingAssignment.GenericLessonPlan) {
        revalidatePath(`/teacher/dashboard/lesson-plans/generic/${existingAssignment.GenericLessonPlan.id}`);
      }
    } else {
      // Existing revalidation code for regular lesson plans
      revalidatePath('/teacher/dashboard/lesson-plans', 'page');
      for (const lp of existingAssignment.lessonPlans) {
        revalidatePath(`/teacher/dashboard/lesson-plans/${lp.id}`, 'page');
      }

      // Revalidate class paths when applicable
      const allClasses = existingAssignment.lessonPlans.flatMap(lp => lp.classes || []);
      if (allClasses.length > 0) {
        for (const classObj of allClasses) {
          if (classObj && classObj.code) {
            revalidatePath(`/teacher/dashboard/classes/${classObj.code}`, 'page');
            revalidatePath(`/teacher/dashboard/classes/${classObj.code}/lesson-plans`, 'page');
            
            for (const lp of existingAssignment.lessonPlans) {
              revalidatePath(`/teacher/dashboard/classes/${classObj.code}/lesson-plans/${lp.id}`, 'page');
            }
          }
        }
      }
    }
    
    return { 
      success: true,
      data: {
        blobDeleteResult,
        submissionBlobResults: [] // Use the existing submission blob results
      }
    };
  } catch (error: any) {
    console.error('Delete assignment error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to delete assignment' };
  }
}

// Submit an assignment - updated to work with lesson plan relationships
export async function submitAssignment(formData: FormData): Promise<AssignmentResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return { success: false, error: 'Unauthorized: Students only' };
    }
    
    const student = await db.student.findFirst({
      where: { userId: session.user.id }
    });

    if (!student) {
      return { success: false, error: 'Student profile not found' };
    }

    const assignmentId = formData.get('assignmentId') as string;
    
    if (!assignmentId) {
      return { success: false, error: 'Missing assignment ID' };
    }
    
    // Check if the assignment exists and student has access through lesson plans
    const assignment = await db.assignment.findFirst({
      where: {
        id: assignmentId,
        lessonPlans: {
          some: {
            classes: {
              some: {
                enrollments: {
                  some: {
                    studentId: student.id,
                    enrolled: true
                  }
                }
              }
            }
          }
        }
      },
      include: { 
        lessonPlans: {
          include: {
            classes: true
          }
        },
        teacher: true
      }
    });
    
    if (!assignment) {
      return { success: false, error: 'Assignment not found or access denied' };
    }

    // Get submission details
    const fileUrl = formData.get('fileUrl') as string || null;
    const textContent = formData.get('textContent') as string || null;
    const comments = formData.get('comments') as string || null;
    const fileName = formData.get('fileName') as string || null;
    const fileType = formData.get('fileType') as string || null;
    const fileSize = formData.get('fileSize') ? parseInt(formData.get('fileSize') as string) : null;
    
    // Check if there's already a submission
    const existingSubmission = await db.studentAssignmentSubmission.findFirst({
      where: {
        assignmentId,
        studentId: student.id
      }
    });

    let submission;

    if (existingSubmission) {
      // Update existing submission
      submission = await db.studentAssignmentSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          fileUrl: fileUrl || existingSubmission.fileUrl,
          textContent: textContent || existingSubmission.textContent,
          comments: comments || existingSubmission.comments,
          fileName: fileName || existingSubmission.fileName,
          fileType: fileType || existingSubmission.fileType,
          fileSize: fileSize || existingSubmission.fileSize,
          status: 'SUBMITTED',
          updatedAt: new Date()
        }
      });
    } else {
      // Create new submission
      submission = await db.studentAssignmentSubmission.create({
        data: {
          assignmentId,
          studentId: student.id,
          fileUrl,
          textContent,
          comments,
          fileName,
          fileType,
          fileSize,
          status: 'SUBMITTED'
        }
      });
    }

    // Revalidate relevant paths for all classes this assignment belongs to
    const allClasses = assignment.lessonPlans.flatMap(lp => lp.classes);
    for (const classObj of allClasses) {
      revalidatePath(`/student/dashboard/classes/${classObj.code}`);
    }
    revalidatePath(`/student/dashboard/assignments`);
    
    return {
      success: true,
      data: submission
    };
  } catch (error: any) {
    console.error('Error submitting assignment:', error);
    return { success: false, error: error.message || 'Failed to submit assignment' };
  }
}

// Updated getStudentAssignment to work with lesson plans
export async function getStudentAssignment(assignmentId: string): Promise<AssignmentResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Find the assignment
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        lessonPlans: {
          include: {
            classes: true
          }
        },
        teacher: true
      }
    });
    
    if (!assignment) {
      return { success: false, error: "Assignment not found" };
    }

    // Check permission based on role
    if (session.user.role === "STUDENT") {
      const student = await db.student.findFirst({
        where: { userId: session.user.id }
      });

      if (!student) {
        return { success: false, error: 'Student profile not found' };
      }

      // Check if student is enrolled in any of the classes this assignment belongs to through lesson plans
      const allClasses = assignment.lessonPlans.flatMap(lp => lp.classes);
      const enrollment = await db.enrollment.findFirst({
        where: {
          studentId: student.id,
          classId: { in: allClasses.map(c => c.id) },
          enrolled: true
        }
      });
      
      if (!enrollment) {
        return { success: false, error: "You don't have access to this assignment" };
      }

      // Get this student's submission
      const submission = await db.studentAssignmentSubmission.findFirst({
        where: {
          assignmentId,
          studentId: student.id
        }
      });

      // Return assignment data with submission details - include ALL fields
      return { 
        success: true, 
        data: {
          id: assignment.id,
          name: assignment.name,
          description: assignment.description, 
          textAssignment: assignment.textAssignment, 
          rubric: assignment.rubric, 
          dueDate: assignment.dueDate,
          activity: assignment.activity || "Assignment",
          fileType: assignment.fileType,
          url: assignment.url,
          size: assignment.size,
          submission: submission || null,
          grade: submission?.grade || null,
          submittedAt: submission?.createdAt || null,
          status: submission?.status || "NOT_SUBMITTED"
        } 
      };
    } 
    else if (session.user.role === "TEACHER") {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher) {
        return { success: false, error: 'Teacher profile not found' };
      }

      // Check if teacher owns this assignment
      if (assignment.teacherId !== teacher.id) {
        return { success: false, error: "You don't have permission to view this assignment" };
      }

      // Get all submissions for this assignment
      const submissions = await db.studentAssignmentSubmission.findMany({
        where: { assignmentId },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      // Return assignment data with all submissions - include ALL fields
      return { 
        success: true, 
        data: {
          id: assignment.id,
          name: assignment.name,
          description: assignment.description, 
          textAssignment: assignment.textAssignment, 
          rubric: assignment.rubric, 
          dueDate: assignment.dueDate,
          activity: assignment.activity || "Assignment",
          fileType: assignment.fileType,
          url: assignment.url,
          size: assignment.size,
          submissions: submissions
        } 
      };
    }

    return { success: false, error: "Invalid user role" };
  } catch (error: any) {
    console.error('Error fetching student assignment:', error);
    return { success: false, error: error.message || 'Failed to load assignment data' };
  }
}

// Get all submissions for a specific assignment (teacher only)
export async function getAssignmentSubmissions(assignmentId: string): Promise<AssignmentResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized: Teachers only' };
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Verify the assignment exists and belongs to this teacher
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        lessonPlans: {
          include: {
            classes: true
          }
        }
      }
    });

    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    if (assignment.teacherId !== teacher.id) {
      return { success: false, error: 'You do not have permission to view these submissions' };
    }

    // Get all submissions for this assignment
    const submissions = await db.studentAssignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return { 
      success: true, 
      data: submissions
    };
  } catch (error: any) {
    console.error('Error fetching assignment submissions:', error);
    return { success: false, error: error.message || 'Failed to load submissions' };
  }
}

// Grade a submission (teacher only)
export async function gradeSubmission({
  submissionId, 
  grade, 
  feedback
}: GradeSubmissionParams): Promise<AssignmentResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized: Teachers only' };
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Get the submission with assignment info to verify ownership
    const submission = await db.studentAssignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            lessonPlans: {
              include: {
                classes: true
              }
            }
          }
        }
      }
    });

    if (!submission) {
      return { success: false, error: 'Submission not found' };
    }

    // Verify the teacher owns the assignment
    if (submission.assignment.teacherId !== teacher.id) {
      return { success: false, error: 'You do not have permission to grade this submission' };
    }

    // Update the submission with grade and status
    const updatedSubmission = await db.studentAssignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: Math.max(0, Math.min(100, grade)), // Ensure grade is between 0-100
        comments: feedback || submission.comments,
        status: 'GRADED',
        updatedAt: new Date()
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true }
        },
        assignment: { select: { name: true } }
      }
    });
    console.log(`Submission ${submissionId} graded by ${teacher.userId}:`, updatedSubmission.grade);

    // Revalidate paths for all classes this assignment belongs to
    const allClasses = submission.assignment.lessonPlans.flatMap(lp => lp.classes);
    for (const classObj of allClasses) {
      revalidatePath(`/teacher/dashboard/classes/${classObj.code}`);
    }
    
    return {
      success: true,
      data: updatedSubmission
    };
  } catch (error: any) {
    console.error('Error grading submission:', error);
    return { success: false, error: error.message || 'Failed to grade submission' };
  }
}

// Add this function to support creating assignments for templates
export async function addAssignmentToGenericLessonPlan(
  genericLessonPlanId: string,
  data: {
    name: string;
    fileType: string;
    activity?: string;
    size?: number;
    url?: string;
    textAssignment?: string;
    description?: string;
  }
): Promise<AssignmentResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "SUPER") {
      return { success: false, error: 'Unauthorized: Super users only' };
    }
    
    // Verify the generic lesson plan exists
    const genericPlan = await db.genericLessonPlan.findUnique({
      where: { id: genericLessonPlanId }
    });

    if (!genericPlan) {
      return { success: false, error: 'Template not found' };
    }
    
    // Find or create teacher record for SUPER user
    let teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacher) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { name: true }
      });
      
      let firstName = "Super";
      let lastName = "User";
      
      if (user?.name) {
        const nameParts = user.name.trim().split(' ');
        firstName = nameParts[0] || "Super";
        lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "User";
      }
      
      teacher = await db.teacher.create({
        data: {
          userId: session.user.id,
          firstName,
          lastName,
        }
      });
    }
    
    // Create the assignment
    const assignment = await db.assignment.create({
      data: {
        name: data.name,
        fileType: data.fileType,
        activity: data.activity,
        size: data.size || 0,
        url: data.url || '',
        textAssignment: data.textAssignment,
        description: data.description,
        teacherId: teacher.id,
        GenericLessonPlan: {
          connect: { id: genericLessonPlanId }
        }
      }
    });
    
    // No visibility settings needed for generic templates
    // since they aren't directly connected to classes
    
    // Revalidate paths
    revalidatePath(`/teacher/dashboard/lesson-plans/generic/${genericLessonPlanId}`);
    
    return { success: true, data: assignment };
  } catch (error: any) {
    console.error('Add assignment to template error:', error);
    return { success: false, error: 'Failed to add assignment to template' };
  }
}