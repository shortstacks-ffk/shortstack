'use server';

import { db } from "@/src/lib/db";
import { getAuthSession } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from '@prisma/client';

// Type definitions
interface AssignmentData {
  name: string;
  activity?: string;
  dueDate?: string | Date;
  classId: string;
  lessonPlanIds?: string[];
  url?: string;
  fileType?: string;
  size?: number;
  textAssignment?: string; // Add this field
}

interface CopyAssignmentParams {
  sourceAssignmentId: string;
  targetLessonPlanId: string;
  targetClassId: string;
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
async function createAssignmentCalendarEvents(assignment: any, classInfo: any): Promise<void> {
  const mainEvent = await db.calendarEvent.create({
    data: {
      title: `Assignment Due: ${assignment.name}`,
      description: assignment.activity || 'Assignment due',
      startDate: assignment.dueDate,
      endDate: new Date(new Date(assignment.dueDate).getTime() + 60 * 60 * 1000), // One hour duration
      isRecurring: false,
      createdById: classInfo.teacherId, // Use teacherId from class
      assignmentId: assignment.id,
      classId: classInfo.id,
      variant: "warning" // Assignments are marked as warning color
    }
  });

  // Get all enrolled students for this class
  const enrolledStudents = await db.enrollment.findMany({
    where: {
      classId: classInfo.id,
      enrolled: true
    }
  });

  // Create calendar events for each enrolled student
  for (const enrollment of enrolledStudents) {
    await db.calendarEvent.create({
      data: {
        title: `Assignment Due: ${assignment.name}`,
        description: assignment.activity || 'Assignment due',
        startDate: assignment.dueDate,
        endDate: new Date(new Date(assignment.dueDate).getTime() + 60 * 60 * 1000),
        isRecurring: false,
        assignmentId: assignment.id,
        studentId: enrollment.studentId,
        parentEventId: mainEvent.id,
        createdById: classInfo.teacherId, // Use teacherId from class
        variant: "warning"
      }
    });
  }
}

// Create an assignment using the required fields
export async function createAssignment(data: AssignmentData): Promise<AssignmentResponse> {
  try {
    console.log("Starting assignment creation...");
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

    if (!data.name || !data.classId) {
      return { success: false, error: 'Missing required fields' };
    }
    
    // Verify the class exists and belongs to this teacher
    const classObj = await db.class.findFirst({
      where: { 
        code: data.classId,
        teacherId: teacher.id
      }
    });
    
    if (!classObj) {
      return { success: false, error: 'Class not found or you do not have permission' };
    }
    
    console.log('Class found with code:', classObj.code, 'and ID:', classObj.id);
    
    // Create assignment with teacherId and connect to class
    const createdAssignment = await db.assignment.create({
      data: {
        name: data.name,
        activity: data.activity,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        teacherId: teacher.id, // Use teacherId from schema
        url: data.url || '', 
        fileType: data.fileType || '',
        size: data.size || 0,
        textAssignment: data.textAssignment, // Add this field
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

    console.log('Assignment created successfully:', createdAssignment.id);
    
    // Create calendar events for the assignment if due date is set
    if (data.dueDate) {
      await createAssignmentCalendarEvents(createdAssignment, {
        id: classObj.id,
        teacherId: teacher.id
      });
      console.log('Calendar events created for assignment');
    }
    
    revalidatePath(`/teacher/dashboard/classes/${classObj.code}`);
    revalidatePath(`/teacher/dashboard/classes/${classObj.code}/lesson-plans`);
    
    return { success: true, data: createdAssignment };
  } catch (error: any) {
    console.error('Create assignment error:', error);
    return { success: false, error: 'Failed to create assignment: ' + (error?.message || '') };
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
        lessonPlans: true,
        classes: true,
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
      // Check if student is enrolled in any of the classes this assignment belongs to
      const student = await db.student.findFirst({
        where: { userId: session.user.id }
      });

      if (!student) {
        return { success: false, error: 'Student profile not found' };
      }

      const hasAccess = await db.enrollment.findFirst({
        where: {
          studentId: student.id,
          classId: { in: assignment.classes.map(c => c.id) },
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
        // Get assignments for specific class
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
          classes: {
            some: {
              id: classObj.id
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
          classes: {
            some: {
              id: classObj.id
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
          classes: {
            some: {
              id: { in: classIds }
            }
          }
        };
      }
    }

    const assignments = await db.assignment.findMany({
      where: whereClause,
      include: { 
        lessonPlans: true,
        classes: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: assignments };
  } catch (error: any) {
    console.error('Get assignments error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to get assignments' };
  }
}

// Update an assignment by ID using the required fields
export async function updateAssignment(id: string, data: AssignmentData): Promise<AssignmentResponse> {
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

    // Verify assignment exists and belongs to teacher
    const existingAssignment = await db.assignment.findUnique({
      where: { id },
      include: { 
        classes: true,
        teacher: true
      }
    });
    
    if (!existingAssignment || existingAssignment.teacherId !== teacher.id) {
      return { success: false, error: 'Assignment not found or you do not have permission' };
    }

    if (!data.name) {
      return { success: false, error: 'Missing required fields' };
    }

    const updatedAssignment = await db.assignment.update({
      where: { id },
      data: {
        name: data.name,
        activity: data.activity,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        textAssignment: data.textAssignment, // Add this field
        lessonPlans: data.lessonPlanIds
          ? {
              set: data.lessonPlanIds.map((lpId) => ({ id: lpId })),
            }
          : undefined,
      },
      include: { 
        lessonPlans: true,
        classes: true
      },
    });

    // Update any related calendar events if dueDate has changed
    if (data.dueDate && existingAssignment.dueDate?.toISOString() !== new Date(data.dueDate).toISOString()) {
      // Delete existing calendar events
      await db.calendarEvent.deleteMany({
        where: { assignmentId: id }
      });
      
      // Create new calendar events with updated date
      for (const classObj of existingAssignment.classes) {
        await createAssignmentCalendarEvents(updatedAssignment, {
          id: classObj.id,
          teacherId: teacher.id
        });
      }
    }

    // Revalidate paths for all classes this assignment belongs to
    for (const classObj of existingAssignment.classes) {
      revalidatePath(`/teacher/dashboard/classes/${classObj.code}`);
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
  targetClassId,
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
      include: { classes: true }
    });

    if (!sourceAssignment || sourceAssignment.teacherId !== teacher.id) {
      return { success: false, error: 'Source assignment not found or you do not have permission' };
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
    
    // Verify target lesson plan exists in target class
    const targetLessonPlan = await db.lessonPlan.findFirst({
      where: {
        id: targetLessonPlanId,
        classes: {
          some: {
            code: targetClassId
          }
        }
      }
    });
    
    if (!targetLessonPlan) {
      return { success: false, error: 'Target lesson plan not found in the specified class' };
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

    // Create calendar events for this assignment if it has a due date
    if (newAssignment.dueDate) {
      await createAssignmentCalendarEvents(newAssignment, {
        id: targetClass.id,
        teacherId: teacher.id
      });
    }

    revalidatePath(`/teacher/dashboard/classes/${targetClass.code}`);
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
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: 'Unauthorized' };
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Verify assignment exists and belongs to teacher
    const existingAssignment = await db.assignment.findUnique({
      where: { id },
      include: { classes: true }
    });
    
    if (!existingAssignment || existingAssignment.teacherId !== teacher.id) {
      return { success: false, error: 'Assignment not found or you do not have permission' };
    }

    // Delete associated calendar events first
    await db.calendarEvent.deleteMany({
      where: { assignmentId: id }
    });

    // Delete associated student submissions
    await db.studentAssignmentSubmission.deleteMany({
      where: { assignmentId: id }
    });

    // Then delete the assignment
    await db.assignment.delete({
      where: { id },
    });

    // Revalidate paths for all classes this assignment belonged to
    for (const classObj of existingAssignment.classes) {
      revalidatePath(`/teacher/dashboard/classes/${classObj.code}`);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Delete assignment error:', error?.message || 'Unknown error');
    return { success: false, error: 'Failed to delete assignment' };
  }
}

// Submit an assignment
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
    
    // Check if the assignment exists and student has access
    const assignment = await db.assignment.findFirst({
      where: {
        id: assignmentId,
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
      },
      include: { 
        classes: true,
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

    // Create or update a calendar event for this submission
    try {
      const teacherId = assignment.teacher.id;
      
      if (teacherId) {
        // First check if there's an existing calendar event
        const existingEvent = await db.calendarEvent.findFirst({
          where: {
            assignmentId,
            studentId: student.id,
            title: { contains: 'Submitted:' }
          }
        });

        const eventTitle = `Submitted: ${assignment.name}`;
        const eventDescription = `Assignment submitted by student on ${new Date().toLocaleString()}`;
        
        if (existingEvent) {
          // Update existing event
          await db.calendarEvent.update({
            where: { id: existingEvent.id },
            data: {
              description: eventDescription,
              updatedAt: new Date()
            }
          });
        } else {
          // Create new event
          await db.calendarEvent.create({
            data: {
              title: eventTitle,
              description: eventDescription,
              startDate: new Date(),
              endDate: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour duration
              isRecurring: false,
              createdById: teacherId,
              assignmentId,
              studentId: student.id,
              variant: "success"
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating calendar event for submission:', error);
      // Don't fail the submission if the calendar event fails
    }

    // Revalidate relevant paths for all classes this assignment belongs to
    for (const classObj of assignment.classes) {
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

// Get a student assignment with submission details
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
        lessonPlans: true,
        classes: true,
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

      // Check if student is enrolled in any of the classes this assignment belongs to
      const enrollment = await db.enrollment.findFirst({
        where: {
          studentId: student.id,
          classId: { in: assignment.classes.map(c => c.id) },
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

      // Return assignment data with submission details
      return { 
        success: true, 
        data: {
          id: assignment.id,
          name: assignment.name,
          description: assignment.description || '',
          dueDate: assignment.dueDate,
          activity: assignment.activity || "Assignment",
          fileType: assignment.fileType,
          url: assignment.url,
          // Include submission details if available
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

      // Return assignment data with all submissions
      return { 
        success: true, 
        data: {
          id: assignment.id,
          name: assignment.name,
          description: assignment.description || '',
          dueDate: assignment.dueDate,
          activity: assignment.activity || "Assignment",
          fileType: assignment.fileType,
          url: assignment.url,
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
        classes: true
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
            classes: true
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

    // Create a calendar event for the student about the grading
    try {
      await db.calendarEvent.create({
        data: {
          title: `Assignment Graded: ${submission.assignment.name}`,
          description: `Your submission has been graded. Grade: ${grade}%${feedback ? `\nFeedback: ${feedback}` : ''}`,
          startDate: new Date(),
          endDate: new Date(new Date().getTime() + 30 * 60 * 1000), // 30 minute duration
          isRecurring: false,
          createdById: teacher.id,
          assignmentId: submission.assignmentId,
          studentId: submission.studentId,
          variant: "success"
        }
      });
    } catch (error) {
      console.error('Error creating calendar event for graded submission:', error);
      // Don't fail if calendar event creation fails
    }

    // Revalidate paths for all classes this assignment belongs to
    for (const classObj of submission.assignment.classes) {
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