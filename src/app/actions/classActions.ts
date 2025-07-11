'use server';

import { db } from "@/src/lib/db";
import { getAuthSession } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from '@prisma/client';
import { createCalendarEventsFromClassSessions } from "@/src/lib/class-utils";
import { formatLocalTimeToUTC, formatUTCToLocalTime } from "@/src/lib/time-utils";

// Types
interface ClassSchedule {
  days: number[]; // 0-6 for days of week
  startTime: string;
  endTime: string; 
}

interface ClassData {
  name: string;
  emoji: string;
  grade?: string;
  color?: string;
  startDate?: Date;
  endDate?: Date;
  schedule?: ClassSchedule;
}

interface ClassResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Helper function to generate a unique class code
async function generateUniqueClassCode(teacherId: string): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 6;

  while (true) {
    let code = '';
    for (let i = 0; i < codeLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }
    
    // Check uniqueness only for the current teacher's classes
    const existingClass = await db.class.findFirst({
      where: { 
        AND: [
          { code },
          { teacherId }
        ]
      }
    });

    if (!existingClass) {
      return code;
    }
  }
}

// Create recurring calendar events for class sessions
async function createClassScheduleEvents(classData: any, schedules: any[], timeZone: string = 'UTC') {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session.user.teacherId) {
      console.log("No valid teacher session for calendar event creation");
      return;
    }
    
    // Create calendar events for each schedule
    for (const schedule of schedules) {
      // Use the days selected in the schedule
      const days = Array.isArray(schedule.days)
        ? schedule.days.map((day: string | number) => typeof day === 'string' ? parseInt(day, 10) : day)
        : [];
      
      if (days.length === 0) {
        console.log("No days specified for this schedule");
        continue;
      }
      
      // Create a single recurring event with all selected days
      const eventTitle = `${classData.emoji} ${classData.name} Class`;
      
      // Convert start/end times to proper date objects preserving local time
      const startHour = parseInt(schedule.startTime.split(':')[0]);
      const startMinute = parseInt(schedule.startTime.split(':')[1]);
      const endHour = parseInt(schedule.endTime.split(':')[0]);
      const endMinute = parseInt(schedule.endTime.split(':')[1]);
      
      // Create dates with the specified times (these will be stored as the user intended)
      const startDate = new Date();
      startDate.setHours(startHour, startMinute, 0, 0);
      
      const endDate = new Date();
      endDate.setHours(endHour, endMinute, 0, 0);
      
      // Store the time zone with the event
      const calendarEvent = await db.calendarEvent.create({
        data: {
          title: eventTitle,
          description: `Regular class session for ${classData.name}`,
          startDate: startDate,
          endDate: endDate,
          variant: classData.color || "primary",
          isRecurring: true,
          recurringDays: days,
          createdById: session.user.teacherId, // Use teacherId instead of userId
          classId: classData.id,
          metadata: {
            timeZone: timeZone,
            type: "class"
          }
        }
      });
      
      // Create class session records
      for (const day of days) {
        await db.classSession.create({
          data: {
            dayOfWeek: day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            classId: classData.id
          }
        });
      }
      
      console.log(`Created recurring calendar event for class ${classData.name} with days: ${days.join(', ')}`);
    }
  } catch (error) {
    console.error("Error creating class schedule events:", error);
  }
}

// Create class
export async function createClass(formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session.user.teacherId || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Extract values from FormData
    const name = formData.get('name') as string;
    const emoji = formData.get('emoji') as string;
    const grade = formData.get('grade') as string;
    const color = formData.get('color') as string;
    const startDateStr = formData.get('startDate') as string;
    const endDateStr = formData.get('endDate') as string;
    const timeZone = formData.get('timeZone') as string || 'UTC';
    
    // Parse schedules from JSON string
    let schedules = [];
    try {
      const schedulesStr = formData.get('schedules');
      if (schedulesStr) {
        schedules = JSON.parse(schedulesStr as string);
      }
    } catch (e) {
      console.error("Failed to parse schedules:", e);
    }

    // Generate unique class code
    const code = await generateUniqueClassCode(session.user.teacherId);
    
    // Parse dates if present
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Validate required fields
    if (!name) {
      return { success: false, error: "Class name is required" };
    }

    const newClass = await db.class.create({
      data: {
        name,
        emoji: emoji || "📚",
        code,
        color: color || "primary",
        grade: grade || undefined,
        startDate,
        endDate,
        teacherId: session.user.teacherId  // Use teacherId instead of userId
      },
      include: {
        classSessions: true,
        _count: { select: { enrollments: true } },
      },
    });

    // Create class sessions and calendar events
    if (schedules && schedules.length > 0) {
      // Create class sessions for each day of the week in the schedule
      for (const schedule of schedules) {
        for (const day of schedule.days) {
          await db.classSession.create({
            data: {
              dayOfWeek: day,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              classId: newClass.id
            }
          });
        }
      }
    }

    // Update revalidation paths
    revalidatePath('/teacher/dashboard/classes', 'page');
    revalidatePath('/teacher/dashboard', 'page');

    // After creating the class, create calendar events
    if (newClass.id && startDate) {
      // First ensure we have the updated class with session data
      const classWithSessions = await db.class.findUnique({
        where: { id: newClass.id },
        include: {
          classSessions: true
        }
      });
      
      if (classWithSessions) {
        // Use the createCalendarEventsFromClassSessions utility
        const events = createCalendarEventsFromClassSessions(
          {
            id: classWithSessions.id,
            name: classWithSessions.name,
            emoji: classWithSessions.emoji,
            code: classWithSessions.code,
            color: classWithSessions.color || undefined,
            grade: classWithSessions.grade || undefined,
            startDate: classWithSessions.startDate || undefined,
            endDate: classWithSessions.endDate || undefined,
            classSessions: classWithSessions.classSessions.map(cs => ({
              dayOfWeek: cs.dayOfWeek,
              startTime: cs.startTime,
              endTime: cs.endTime
            }))
          },
          session.user.teacherId,
          timeZone
        );
        
        // Create each event
        for (const eventData of events) {
          await db.calendarEvent.create({
            data: {
              ...eventData,
              createdById: session.user.teacherId
            }
          });
        }
        
        console.log(`Created ${events.length} calendar events for class ${newClass.name}`);
      }
    }

    return {
      success: true,
      id: newClass.id,
      name: newClass.name,
      emoji: newClass.emoji,
      code: newClass.code,
      color: newClass.color ?? undefined,
      grade: newClass.grade ?? undefined,
      startDate: newClass.startDate ?? undefined,
      endDate: newClass.endDate ?? undefined,
      classSessions: newClass.classSessions,
      numberOfStudents: newClass._count?.enrollments || 0,
    };
  } catch (error: any) {
    console.error("Create class error:", error);
    return { success: false, error: error.message || "Failed to create class" };
  }
}

// Get classes (for the logged-in user: teacher's classes or student's enrolled classes)
export async function getClasses(): Promise<ClassResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      console.error("No authenticated user session found");
      return { success: false, error: "Unauthorized" };
    }

    let classes;
    if (session.user.role === "TEACHER" && session.user.teacherId) {
      console.log(`Fetching classes for teacher ${session.user.teacherId}`);
      classes = await db.class.findMany({
        where: { teacherId: session.user.teacherId },
        orderBy: { createdAt: 'desc' },
        include: {
          classSessions: true, // Include class sessions to access schedule info
          _count: { 
            select: { 
              enrollments: true 
            } 
          } 
        }
      });
      console.log(`Found ${classes.length} classes for teacher ${session.user.teacherId}`);
    } else if (session.user.role === "STUDENT" && session.user.studentId) {
      // Student view stays the same since they should only see classes they're enrolled in
      console.log(`Fetching classes for student ${session.user.studentId}`);
      classes = await db.class.findMany({
        where: {
          enrollments: {
            some: {
              studentId: session.user.studentId,
              enrolled: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        include: {
          classSessions: true, // Include class sessions to access schedule info
          teacher: { select: { firstName: true, lastName: true } } // Include teacher name
        }
      });
      console.log(`Found ${classes.length} classes for student ${session.user.studentId}`);
    } else {
      console.error("Invalid user role or missing profile ID", { 
        role: session.user.role,
        teacherId: session.user.teacherId,
        studentId: session.user.studentId
      });
      return { success: false, error: "Invalid user role or missing profile ID" };
    }

    return { success: true, data: classes };
  } catch (error: any) {
    console.error("Get classes error:", error);
    return { success: false, error: "Failed to fetch classes: " + (error.message || "Unknown error") };
  }
}

// Get Class By ID (ensure user has access)
export const getClassByID = async (id: string): Promise<ClassResponse> => {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const classData = await db.class.findUnique({
      where: { id },
      include: {
        classSessions: true, // Include class sessions
        teacher: { select: { id: true, firstName: true, lastName: true, userId: true } },
        enrollments: {
          where: { enrolled: true },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, schoolEmail: true, profileImage: true }
            }
          },
          orderBy: { student: { lastName: 'asc' } }
        },
        lessonPlans: { orderBy: { createdAt: 'asc' } },
        bills: { orderBy: { dueDate: 'asc' } },
        storeItems: { orderBy: { name: 'asc' } },
      }
    });

    if (!classData) {
      return { success: false, error: "Class not found" };
    }

    // Authorization check
    if (session.user.role === "TEACHER" && session.user.teacherId) {
      if (classData.teacherId !== session.user.teacherId) {
        return { success: false, error: "Forbidden: You do not own this class" };
      }
    } else if (session.user.role === "STUDENT" && session.user.studentId) {
      const isEnrolled = await db.enrollment.findFirst({
        where: {
          classId: id,
          studentId: session.user.studentId,
          enrolled: true
        }
      });
      
      if (!isEnrolled) {
        return { success: false, error: "Forbidden: Not enrolled in this class" };
      }
    } else {
      return { success: false, error: "Invalid user role or missing profile ID" };
    }

    return { success: true, data: classData };
  } catch (error: any) {
    console.error("Get class by ID error:", error);
    return { success: false, error: "Failed to fetch class data" };
  }
}

// Update class (only teacher owner)
export async function updateClass(id: string, data: any): Promise<ClassResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session.user.teacherId || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    const existingClass = await db.class.findUnique({
      where: { id },
      select: { teacherId: true }
    });

    if (!existingClass || existingClass.teacherId !== session.user.teacherId) {
      return { success: false, error: "Class not found or you don't have permission to update it" };
    }

    // Ensure color is validated before updating
    const validColor = ["primary", "secondary", "destructive", "success", "warning", "default"].includes(data.color || "") 
      ? data.color 
      : "primary";

    // Update class with clean data
    const updatedClass = await db.class.update({
      where: { id },
      data: {
        name: data.name,
        emoji: data.emoji,
        grade: data.grade,
        color: validColor,
        startDate: data.startDate,
        endDate: data.endDate
      }
    });

    // Delete existing sessions
    await db.classSession.deleteMany({
      where: { classId: id }
    });
    
    // Delete existing recurring calendar events
    await db.calendarEvent.deleteMany({
      where: { 
        classId: id,
        isRecurring: true
      }
    });

    // Process each schedule and collect the created sessions
    const createdSessions = [];
    if (data.schedules && data.schedules.length > 0) {
      for (const schedule of data.schedules) {
        const dayNumbers = schedule.days.map((day: any) => 
          typeof day === "string" ? parseInt(day, 10) : day
        );
        
        if (dayNumbers.length === 0) continue;

        // Create class session records for this time slot
        for (const day of dayNumbers) {
          const session = await db.classSession.create({
            data: {
              classId: id,
              dayOfWeek: day,
              startTime: schedule.startTime,
              endTime: schedule.endTime
            }
          });
          createdSessions.push(session);
        }
        
        // Create calendar event for this time slot
        const eventTitle = `${data.emoji} ${data.name} Class`;
        
        // Convert start/end times to proper date objects
        const startHour = parseInt(schedule.startTime.split(':')[0]);
        const startMinute = parseInt(schedule.startTime.split(':')[1]);
        const endHour = parseInt(schedule.endTime.split(':')[0]);
        const endMinute = parseInt(schedule.endTime.split(':')[1]);
        
        const startDate = new Date();
        startDate.setHours(startHour, startMinute, 0, 0);
        
        const endDate = new Date();
        endDate.setHours(endHour, endMinute, 0, 0);
        
        await db.calendarEvent.create({
          data: {
            title: eventTitle,
            description: `Regular class session for ${data.name}`,
            startDate: startDate,
            endDate: endDate,
            variant: validColor,
            isRecurring: true,
            recurringDays: dayNumbers,
            createdById: session.user.teacherId,
            classId: id
          }
        });
      }
    }

    // Recreate calendar events with the utility (if needed)
    if (data.startDate) {
      // Get the updated class with new sessions
      const updatedClassWithSessions = await db.class.findUnique({
        where: { id },
        include: {
          classSessions: true
        }
      });
      
      if (updatedClassWithSessions) {
        const events = createCalendarEventsFromClassSessions(
          {
            id: updatedClassWithSessions.id,
            name: updatedClassWithSessions.name,
            emoji: updatedClassWithSessions.emoji,
            code: updatedClassWithSessions.code,
            color: updatedClassWithSessions.color || undefined,
            grade: updatedClassWithSessions.grade || undefined,
            startDate: updatedClassWithSessions.startDate || undefined,
            endDate: updatedClassWithSessions.endDate || undefined,
            classSessions: updatedClassWithSessions.classSessions.map(cs => ({
              dayOfWeek: cs.dayOfWeek,
              startTime: cs.startTime,
              endTime: cs.endTime
            }))
          },
          session.user.teacherId,
          data.timeZone || 'UTC'
        );
        
        // Create each event
        for (const eventData of events) {
          await db.calendarEvent.create({
            data: {
              ...eventData,
              createdById: session.user.teacherId
            }
          });
        }
        
        console.log(`Created ${events.length} calendar events for updated class ${updatedClassWithSessions.name}`);
      }
    }

    // Ensure revalidation is immediate and covers all necessary paths
    revalidatePath('/teacher/dashboard/classes', 'page');
    revalidatePath(`/teacher/dashboard/classes/${id}`, 'page');
    revalidatePath('/teacher/dashboard', 'page');
    revalidatePath('/', 'layout');
    
    return { 
      success: true, 
      data: {
        id: updatedClass.id,
        name: updatedClass.name,
        emoji: updatedClass.emoji,
        code: updatedClass.code,
        color: updatedClass.color ?? undefined,
        grade: updatedClass.grade ?? undefined,
        startDate: updatedClass.startDate ?? undefined,
        endDate: updatedClass.endDate ?? undefined,
        // Return the actual created sessions instead of trying to use data.classSessions
        classSessions: createdSessions.map((session: any) => ({
          id: session.id,
          dayOfWeek: session.dayOfWeek,
          startTime: session.startTime,
          endTime: session.endTime
        }))
      }
    };
  } catch (error: any) {
    console.error("Update class error:", error);
    return { success: false, error: `Failed to update class: ${error.message}` };
  }
}

// Delete class (only teacher owner)
export async function deleteClass(id: string): Promise<ClassResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session.user.teacherId || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify teacher owns the class
    const classToDelete = await db.class.findUnique({
      where: { id },
      select: { teacherId: true, code: true }
    });

    if (!classToDelete || classToDelete.teacherId !== session.user.teacherId) {
      return { success: false, error: "Class not found or access denied" };
    }

    // Delete associated calendar events first
    await db.calendarEvent.deleteMany({
      where: { classId: id }
    });

    // Then delete the class
    await db.class.delete({
      where: { id }
    });

    // Make sure revalidation happens
    revalidatePath("/teacher/dashboard/classes");
    
    return { success: true };
  } catch (error: any) {
    console.error("Delete class error:", error);
    
    // Handle constraints errors properly
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return { 
          success: false, 
          error: "Cannot delete class: It has related records that couldn't be automatically deleted. Please remove them first." 
        };
      }
      if (error.code === 'P2025') {
        return { success: false, error: "Class not found" };
      }
    }
    
    return { success: false, error: "Failed to delete class" };
  }
}

// Get class data by class code
export async function getClassData(classCode: string): Promise<ClassResponse> {
  try {
    console.log(`Getting class data for code: ${classCode}`);
    
    const session = await getAuthSession();
    if (!session?.user?.id) {
      console.log("No authenticated user");
      return { success: false, error: "Unauthorized" };
    }
    
    // Find the class first
    const classExists = await db.class.findUnique({
      where: { code: classCode },
      select: { id: true, teacherId: true }
    });

    if (!classExists) {
      console.log(`Class not found with code: ${classCode}`);
      return { success: false, error: "Class not found" };
    }

    // Determine if the user has access to this class
    let hasAccess = false;

    if (session.user.role === "TEACHER" && session.user.teacherId) {
      // Teacher owns the class
      hasAccess = classExists.teacherId === session.user.teacherId;
    } else if (session.user.role === "STUDENT" && session.user.studentId) {
      // Check enrollment for student
      const enrollment = await db.enrollment.findFirst({
        where: {
          classId: classExists.id,
          studentId: session.user.studentId,
          enrolled: true
        }
      });
      
      hasAccess = !!enrollment;
    }

    if (!hasAccess) {
      console.log("User does not have access to this class");
      return { success: false, error: "Forbidden: You do not have access to this class" };
    }

    // Fetch full class data now that we know user has access
    const classData = await db.class.findUnique({
      where: { id: classExists.id },
      include: {
        classSessions: true, // Include class sessions
        teacher: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true,
            profileImage: true,
            user: {
              select: {
                email: true
              }
            }
          } 
        },
        _count: { 
          select: { 
            enrollments: { where: { enrolled: true } } 
          } 
        },
        lessonPlans: { 
          orderBy: { createdAt: 'asc' },
          include: {
            files: true,
            assignments: true,
          }
        }
      }
    });

    console.log("Successfully retrieved class data");
    return { success: true, data: classData };
  } catch (error: any) {
    console.error("Get class data by code error:", error);
    return { success: false, error: "Failed to fetch class data: " + error.message };
  }
}