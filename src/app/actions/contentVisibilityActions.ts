'use server';

import { db } from '@/src/lib/db';
import { getAuthSession } from '@/src/lib/auth';
import { revalidatePath } from 'next/cache';

// Types
interface VisibilityResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Helper function to send email notifications (placeholder)
async function sendAssignmentNotification({
  studentEmail,
  studentName,
  assignmentName,
  dueDate,
  teacherName
}: {
  studentEmail: string;
  studentName: string;
  assignmentName: string;
  dueDate: Date | null;
  teacherName: string;
}) {
  try {
    // This is where you would implement your email sending logic
    // For now, we'll just log it
    console.log('Would send assignment notification:');
    console.log({ studentEmail, studentName, assignmentName, dueDate, teacherName });
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}

// Update file visibility for one or more classes
export async function updateFileVisibility({
  fileId,
  classIds,
  visibleToStudents,
  visibilityStartDate,
}: {
  fileId: string;
  classIds: string[];
  visibleToStudents: boolean;
  visibilityStartDate?: Date | string | null;
}): Promise<VisibilityResponse> {
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

    // Verify teacher owns the file
    const file = await db.file.findFirst({
      where: { 
        id: fileId,
        teacherId: teacher.id 
      },
      include: {
        lessonPlans: {
          include: {
            classes: true
          }
        }
      }
    });

    if (!file) {
      return { success: false, error: 'File not found or you do not have permission' };
    }

    // Convert visibility date if provided
    let parsedDate: Date | null = null;
    if (visibilityStartDate) {
      parsedDate = new Date(visibilityStartDate);
    }

    // Update visibility for each class
    for (const classId of classIds) {
      // Verify the class belongs to this teacher and contains this lesson plan
      const classObj = await db.class.findFirst({
        where: { 
          id: classId,
          teacherId: teacher.id,
          lessonPlans: {
            some: {
              files: {
                some: {
                  id: fileId
                }
              }
            }
          }
        }
      });

      if (!classObj) {
        continue; // Skip classes that don't match criteria
      }

      // Update or create visibility setting
      await db.classContentVisibility.upsert({
        where: {
          classId_fileId: {
            classId,
            fileId
          }
        },
        update: {
          visibleToStudents,
          visibilityStartDate: parsedDate,
          updatedAt: new Date()
        },
        create: {
          classId,
          fileId,
          visibleToStudents,
          visibilityStartDate: parsedDate
        }
      });

      // Revalidate paths
      revalidatePath(`/teacher/dashboard/classes/${classObj.code}`);
      revalidatePath(`/teacher/dashboard/classes/${classObj.code}/lesson-plans`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Update file visibility error:', error);
    return { success: false, error: 'Failed to update file visibility' };
  }
}

// Update assignment visibility and due dates for one or more classes
export async function updateAssignmentVisibility({
  assignmentId,
  classIds,
  visibleToStudents,
  visibilityStartDate,
  dueDate,
  sendNotifications = false,
}: {
  assignmentId: string;
  classIds: string[];
  visibleToStudents: boolean;
  visibilityStartDate?: Date | string | null;
  dueDate?: Date | string | null; // This is now a combined date/time
  sendNotifications?: boolean;
}): Promise<VisibilityResponse> {
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

    // Verify teacher owns the assignment
    const assignment = await db.assignment.findFirst({
      where: { 
        id: assignmentId,
        teacherId: teacher.id 
      },
      include: {
        lessonPlans: {
          include: {
            classes: true
          }
        }
      }
    });

    if (!assignment) {
      return { success: false, error: 'Assignment not found or you do not have permission' };
    }

    // Convert dates if provided
    let parsedVisibilityDate: Date | null = null;
    if (visibilityStartDate) {
      parsedVisibilityDate = new Date(visibilityStartDate);
    }

    let parsedDueDate: Date | null = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
    }

    // Track classes for notifications
    const classesUpdated = [];

    // IMPORTANT: First update the assignment due date if provided
    if (parsedDueDate) {
      await db.assignment.update({
        where: { id: assignmentId },
        data: { dueDate: parsedDueDate }
      });
      
      console.log(`Updated assignment ${assignmentId} with due date ${parsedDueDate.toISOString()}`);
    }

    // Update visibility for each class
    for (const classId of classIds) {
      // Verify the class belongs to this teacher and contains this lesson plan
      const classObj = await db.class.findFirst({
        where: { 
          id: classId,
          teacherId: teacher.id,
          lessonPlans: {
            some: {
              assignments: {
                some: {
                  id: assignmentId
                }
              }
            }
          }
        },
        include: {
          enrollments: {
            where: { enrolled: true },
            include: { student: true }
          }
        }
      });

      if (!classObj) {
        continue; // Skip classes that don't match criteria
      }

      // Update or create visibility setting
      await db.classContentVisibility.upsert({
        where: {
          classId_assignmentId: {
            classId,
            assignmentId
          }
        },
        update: {
          visibleToStudents,
          visibilityStartDate: parsedVisibilityDate,
          dueDate: parsedDueDate,
          updatedAt: new Date()
        },
        create: {
          classId,
          assignmentId,
          visibleToStudents,
          visibilityStartDate: parsedVisibilityDate,
          dueDate: parsedDueDate
        }
      });

      // Revalidate paths
      revalidatePath(`/teacher/dashboard/classes/${classObj.code}`);
      revalidatePath(`/teacher/dashboard/classes/${classObj.code}/lesson-plans`);

      // Track class for notifications
      classesUpdated.push(classObj);
    }

    // Send email notifications if requested and visibility is immediate or already active
    if (sendNotifications && visibleToStudents) {
      const shouldSendNow = !parsedVisibilityDate || parsedVisibilityDate <= new Date();
      
      if (shouldSendNow) {
        // Collect all students from all updated classes
        const students = classesUpdated.flatMap(cls => 
          cls.enrollments.map(enrollment => enrollment.student)
        );
        
        // Remove duplicates (if a student is in multiple classes)
        const uniqueStudents = [...new Map(students.map(s => [s.id, s])).values()];
        
        // Send notifications to students
        for (const student of uniqueStudents) {
          if (student.schoolEmail) {
            await sendAssignmentNotification({
              studentEmail: student.schoolEmail,
              studentName: `${student.firstName} ${student.lastName}`,
              assignmentName: assignment.name,
              dueDate: parsedDueDate,
              teacherName: `${teacher.firstName} ${teacher.lastName}`
            });
          }
        }
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Update assignment visibility error:', error);
    return { success: false, error: 'Failed to update assignment visibility' };
  }
}

// Get visibility settings for content in a specific class
export async function getClassContentVisibility(
  classId: string
): Promise<VisibilityResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if the user has access to this class
    let hasAccess = false;

    if (session.user.role === 'TEACHER') {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!teacher) {
        return { success: false, error: 'Teacher profile not found' };
      }

      const classObj = await db.class.findFirst({
        where: {
          id: classId,
          teacherId: teacher.id
        }
      });
      
      hasAccess = !!classObj;
    } else if (session.user.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!student) {
        return { success: false, error: 'Student profile not found' };
      }
      
      const enrollment = await db.enrollment.findFirst({
        where: {
          classId,
          studentId: student.id,
          enrolled: true
        }
      });
      
      hasAccess = !!enrollment;
    } else if (session.user.role === 'SUPER') {
      hasAccess = true;
    }

    if (!hasAccess) {
      return { success: false, error: 'You do not have access to this class' };
    }

    // Get all visibility settings for this class
    const visibilitySettings = await db.classContentVisibility.findMany({
      where: { classId },
      include: {
        file: {
          select: {
            id: true,
            name: true,
            fileType: true,
            url: true
          }
        },
        assignment: {
          select: {
            id: true,
            name: true,
            fileType: true,
            activity: true,
            textAssignment: true,
            description: true
          }
        }
      }
    });

    return { success: true, data: visibilitySettings };
  } catch (error: any) {
    console.error('Get class content visibility error:', error);
    return { success: false, error: 'Failed to get visibility settings' };
  }
}

// Ensure visibility records exist for content
export async function ensureVisibilityRecords({
  contentType,
  contentId,
  classIds,
}: {
  contentType: 'file' | 'assignment';
  contentId: string;
  classIds: string[];
}): Promise<VisibilityResponse> {
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

    // If no classes provided, there's nothing to do
    if (!classIds || classIds.length === 0) {
      return { 
        success: true, 
        data: { 
          created: 0,
          existing: 0,
          total: 0,
          message: 'No classes provided' 
        } 
      };
    }

    // Check ownership based on content type
    if (contentType === 'file') {
      const file = await db.file.findFirst({
        where: { 
          id: contentId,
          teacherId: teacher.id 
        }
      });
      
      if (!file) {
        return { success: false, error: 'File not found or you do not have permission' };
      }
    } else {
      const assignment = await db.assignment.findFirst({
        where: { 
          id: contentId,
          teacherId: teacher.id 
        }
      });
      
      if (!assignment) {
        return { success: false, error: 'Assignment not found or you do not have permission' };
      }
    }

    // Get existing visibility records
    const existingRecords = await db.classContentVisibility.findMany({
      where: {
        ...(contentType === 'file' ? { fileId: contentId } : { assignmentId: contentId }),
        classId: { in: classIds }
      }
    });
    
    const existingClassIds = existingRecords.map(record => record.classId);
    const missingClassIds = classIds.filter(id => !existingClassIds.includes(id));
    
    // Create missing visibility records (default to hidden)
    for (const classId of missingClassIds) {
      await db.classContentVisibility.create({
        data: {
          classId,
          ...(contentType === 'file' 
            ? { fileId: contentId } 
            : { assignmentId: contentId }),
          visibleToStudents: false
        }
      });
      console.log(`Created visibility record for ${contentType} ${contentId} in class ${classId}`);
    }

    return { 
      success: true, 
      data: { 
        created: missingClassIds.length,
        existing: existingRecords.length,
        total: classIds.length
      } 
    };
  } catch (error: any) {
    console.error('Ensure visibility records error:', error);
    return { success: false, error: 'Failed to ensure visibility records' };
  }
}