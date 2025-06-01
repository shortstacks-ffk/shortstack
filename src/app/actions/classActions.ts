'use server';

import { db } from "@/src/lib/db";
import { getAuthSession } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from '@prisma/client';
import { createCalendarEventsFromClassSessions } from "@/src/lib/class-utils";

// Types
interface ClassSchedule {
  days: number[]; // 0-6 for days of week
  startTime: string; // e.g., "09:00" - format needed for ClassSession
  endTime: string; // e.g., "11:00" - format needed for ClassSession
}

interface ClassData {
  name: string;
  emoji: string;
  cadence?: string;
  grade?: string;
  color?: string;
  startDate?: Date; // Add startDate field
  endDate?: Date;   // Add endDate field
  schedule?: ClassSchedule;
}

interface ClassResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Helper function to generate a unique class code
async function generateUniqueClassCode(userId: string): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 6;

  while (true) {
    let code = '';
    for (let i = 0; i < codeLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }
    
    // Check uniqueness only for the current user's classes
    const existingClass = await db.class.findFirst({
      where: { 
        AND: [
          { code },
          { userId }
        ]
      }
    });

    if (!existingClass) {
      return code;
    }
  }
}

// Create recurring calendar events for class sessions
async function createClassScheduleEvents(classData: any, schedules: any[]) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      console.log("No session for calendar event creation");
      return;
    }
    
    // Create calendar events for each schedule
    for (const schedule of schedules) {
      // Ensure days is an array of numbers
      const days: number[] = Array.isArray(schedule.days)
        ? schedule.days.map((day: string | number) => typeof day === 'string' ? parseInt(day, 10) : day)
        : [];
      
      if (days.length === 0) {
        console.log("No days specified for this schedule");
        continue;
      }
      
      // Create a single recurring event with all selected days
      const eventTitle = `${classData.emoji} ${classData.name} Class`;
      
      // Convert start/end times to proper date objects
      const startHour = parseInt(schedule.startTime.split(':')[0]);
      const startMinute = parseInt(schedule.startTime.split(':')[1]);
      const endHour = parseInt(schedule.endTime.split(':')[0]);
      const endMinute = parseInt(schedule.endTime.split(':')[1]);
      
      const startDate = new Date();
      startDate.setHours(startHour, startMinute, 0, 0);
      
      const endDate = new Date();
      endDate.setHours(endHour, endMinute, 0, 0);
      
      // Create one calendar event with all recurring days
      const calendarEvent = await db.calendarEvent.create({
        data: {
          title: eventTitle,
          description: `Regular class session for ${classData.name}`,
          startDate: startDate,
          endDate: endDate,
          variant: classData.color || "primary",
          isRecurring: true,
          recurringDays: days, // Ensure these are numbers (0-6)
          createdById: session.user.id,
          classId: classData.id,
        }
      });
      
      // Create class session records - ensure dayOfWeek is a number
      for (const day of days) {
        await db.classSession.create({
          data: {
            dayOfWeek: day, // Store as number (0-6)
            startTime: schedule.startTime, // Store as string (HH:MM)
            endTime: schedule.endTime, // Store as string (HH:MM)
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
export async function createClass(data: any) {
  try {
    const newClass = await db.class.create({
      data: {
        name: data.name,
        emoji: data.emoji,
        code: data.code,
        cadence: data.cadence,
        color: data.color,
        grade: data.grade,
        startDate: data.startDate,
        endDate: data.endDate,
        userId: data.userId
      },
      include: {
        classSessions: true,
        _count: { select: { enrollments: true } },
      },
    });

    // Create class sessions and calendar events
    if (data.schedules && data.schedules.length > 0) {
      await createClassScheduleEvents(newClass, data.schedules);
    }

    // Update revalidation paths
    revalidatePath('/teacher/dashboard/classes', 'page');
    revalidatePath('/teacher/dashboard', 'page');

    // After creating the class, create calendar events
    if (newClass.classSessions && newClass.classSessions.length > 0 && newClass.startDate) {
      const calendarEvents = createCalendarEventsFromClassSessions(
        {
          id: newClass.id,
          name: newClass.name,
          emoji: newClass.emoji,
          code: newClass.code,
          color: newClass.color || "primary",
          cadence: newClass.cadence || "weekly",
          grade: newClass.grade ?? undefined,
          startDate: new Date(newClass.startDate),
          endDate: newClass.endDate ? new Date(newClass.endDate) : undefined,
          classSessions: newClass.classSessions,
        },
        data.userId
      );

      // Batch create calendar events
      for (const event of calendarEvents) {
        await db.calendarEvent.create({
          data: {
            title: event.title,
            description: event.description,
            startDate: event.startDate,
            endDate: event.endDate,
            variant: event.variant,
            isRecurring: event.isRecurring,
            createdBy: { connect: { id: data.userId } },
            class: { connect: { id: newClass.id } }
          },
        });
      }
    }

    return {
      success: true,
      id: newClass.id,
      name: newClass.name,
      emoji: newClass.emoji,
      code: newClass.code,
      color: newClass.color ?? undefined,
      cadence: newClass.cadence ?? undefined,
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
      return { success: false, error: "Unauthorized" };
    }

    let classes;
    if (session.user.role === "TEACHER") {
      classes = await db.class.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          classSessions: true, // Include class sessions to access schedule info
          _count: { select: { enrollments: { where: { enrolled: true } } } } // Count enrolled students
        }
      });
    } else if (session.user.role === "STUDENT") {
      classes = await db.class.findMany({
        where: {
          enrollments: {
            some: {
              student: { userId: session.user.id },
              enrolled: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        include: {
          classSessions: true, // Include class sessions to access schedule info
          user: { select: { name: true, firstName: true, lastName: true } } // Include teacher name
        }
      });
    } else {
      return { success: false, error: "Invalid user role" };
    }

    return { success: true, data: classes };
  } catch (error: any) {
    console.error("Get classes error:", error);
    return { success: false, error: "Failed to fetch classes" };
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
        user: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
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
    if (session.user.role === "TEACHER" && classData.userId !== session.user.id) {
      return { success: false, error: "Forbidden: You do not own this class" };
    } else if (session.user.role === "STUDENT") {
      const isEnrolled = await db.enrollment.findFirst({
        where: {
          classId: id,
          student: { userId: session.user.id },
          enrolled: true
        }
      });
      
      if (!isEnrolled) {
        return { success: false, error: "Forbidden: Not enrolled in this class" };
      }
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
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    const existingClass = await db.class.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!existingClass || existingClass.userId !== session.user.id) {
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
        cadence: data.cadence,
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

    // Process each schedule
    if (data.schedules && data.schedules.length > 0) {
      for (const schedule of data.schedules) {
        // Ensure days are numeric (0-6)
        const dayNumbers = schedule.days.map((day: any) => 
          typeof day === "string" ? parseInt(day, 10) : day
        );
        
        if (dayNumbers.length === 0) continue;

        // Create class session records for this time slot
        for (const day of dayNumbers) {
          await db.classSession.create({
            data: {
              classId: id,
              dayOfWeek: day,
              startTime: schedule.startTime,
              endTime: schedule.endTime
            }
          });
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
            createdById: session.user.id,
            classId: id,
          }
        });
      }
    }

    // After updating the class, update calendar events
    if (data.classSessions?.length && data.startDate) {
      // Delete existing calendar events for this class
      const existingEvents = await db.calendarEvent.findMany({
        where: { classId: id },
      });

      // Delete calendar events related to this class
      await db.calendarEvent.deleteMany({
        where: {
          OR: [
            { classId: id },
            { parentEventId: { in: existingEvents.map((e) => e.id) } },
          ],
        },
      });

      // Create new calendar events
      const calendarEvents = createCalendarEventsFromClassSessions(
        {
          id: updatedClass.id,
          name: updatedClass.name,
          emoji: updatedClass.emoji,
          code: updatedClass.code,
          color: updatedClass.color || "primary",
          cadence: updatedClass.cadence || "weekly",
          grade: updatedClass.grade ?? undefined,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          classSessions: data.classSessions,
        },
        session.user.id
      );

      // Batch create calendar events
      for (const event of calendarEvents) {
        await db.calendarEvent.create({
          data: {
            title: event.title,
            description: event.description,
            startDate: event.startDate,
            endDate: event.endDate,
            variant: event.variant,
            isRecurring: event.isRecurring,
            createdBy: { connect: { id: session.user.id } },
            class: { connect: { id: updatedClass.id } }
          },
        });
      }
    }

    // Ensure revalidation is immediate and covers all necessary paths
    revalidatePath('/teacher/dashboard/classes', 'layout');
    revalidatePath('/teacher/dashboard', 'layout');
    
    return { 
      success: true, 
      data: {
        id: updatedClass.id,
        name: updatedClass.name,
        emoji: updatedClass.emoji,
        code: updatedClass.code,
        color: updatedClass.color ?? undefined,
        cadence: updatedClass.cadence ?? undefined,
        grade: updatedClass.grade ?? undefined,
        startDate: updatedClass.startDate ?? undefined,
        endDate: updatedClass.endDate ?? undefined,
        classSessions: (data.classSessions || []).map((session: any) => ({
          id: session.id,
          dayOfWeek: session.dayOfWeek,
          startTime: session.startTime,
          endTime: session.endTime
        })) ?? []
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
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify teacher owns the class
    const classToDelete = await db.class.findUnique({
      where: { id },
      select: { userId: true, code: true }
    });

    if (!classToDelete || classToDelete.userId !== session.user.id) {
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

    revalidatePath("/teacher/dashboard/classes");
    return { success: true };
  } catch (error: any) {
    console.error("Delete class error:", error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return { success: false, error: "Cannot delete class: It has related records that couldn't be automatically deleted. Please remove them first." };
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
    
    const userId = session.user.id;
    const isStudent = session.user.role === "STUDENT";
    const isTeacher = session.user.role === "TEACHER";
    
    console.log(`User role: ${session.user.role}, User ID: ${userId}`);

    // Find the class first
    const classExists = await db.class.findUnique({
      where: { code: classCode },
      select: { id: true, userId: true }
    });

    if (!classExists) {
      console.log(`Class not found with code: ${classCode}`);
      return { success: false, error: "Class not found" };
    }

    // Determine if the user has access to this class
    let hasAccess = false;

    if (isTeacher && classExists.userId === userId) {
      // Teacher owns the class
      hasAccess = true;
    } else if (isStudent) {
      // Check enrollment for student
      const enrollment = await db.enrollment.findFirst({
        where: {
          classId: classExists.id,
          studentId: userId,
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
        user: { 
          select: { 
            id: true, 
            name: true, 
            firstName: true, 
            lastName: true, 
            email: true,
            image: true 
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
            assignmentRelations: true,
          }
        }
      }
    });

    // For backwards compatibility, map assignmentRelations to assignments
    if (classData && classData.lessonPlans) {
      classData.lessonPlans = classData.lessonPlans.map(plan => ({
        ...plan,
        assignments: plan.assignmentRelations
      }));
    }

    console.log("Successfully retrieved class data");
    return { success: true, data: classData };
  } catch (error: any) {
    console.error("Get class data by code error:", error);
    return { success: false, error: "Failed to fetch class data: " + error.message };
  }
}

// Test database connection - for debugging
export async function testDbConnection(): Promise<ClassResponse> {
  try {
    const count = await db.class.count();
    return { 
      success: true, 
      data: { message: "Database connection successful", count } 
    };
  } catch (error: any) {
    console.error("Database connection error:", error);
    return { 
      success: false, 
      error: `Database connection failed: ${error.message}` 
    };
  }
}