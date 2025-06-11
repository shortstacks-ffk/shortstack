import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";
import { getUserTimeZone } from "@/src/lib/time-utils";
import { getFrequencyDisplayText, getStatusColor } from "@/src/lib/bill-utils";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start') ? new Date(searchParams.get('start')!) : undefined;
    const end = searchParams.get('end') ? new Date(searchParams.get('end')!) : undefined;

    let whereClause: any = {};

    if (session.user.role === 'TEACHER' || session.user.role === 'SUPER') {
      // Teachers and super users see events they created
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (teacher) {
        whereClause = {
          createdById: teacher.id // Use teacher.id instead of session.user.id
        };
      } else {
        // If no teacher profile found, only show events created by user ID
        whereClause = {
          createdById: session.user.id
        };
      }
    } else if (session.user.role === 'STUDENT') {
      // Students see their own events and events from their enrolled classes
      const student = await db.student.findFirst({
        where: { 
          OR: [
            { userId: session.user.id },
            ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
          ]
        },
        select: { id: true }
      });

      if (student) {
        // Get classes the student is enrolled in
        const enrollments = await db.enrollment.findMany({
          where: {
            studentId: student.id,
            enrolled: true
          },
          select: { classId: true }
        });

        const enrolledClassIds = enrollments.map(e => e.classId);

        whereClause = {
          OR: [
            { createdById: session.user.id }, // Events created by the student
            { studentId: student.id }, // Events specifically for this student
            ...(enrolledClassIds.length > 0 ? [{
              classId: { in: enrolledClassIds } // Events for classes they're enrolled in
            }] : [])
          ]
        };
      } else {
        // If no student profile found, only show events they created
        whereClause = {
          createdById: session.user.id
        };
      }
    } else {
      // Default: only show events created by the user
      whereClause = {
        createdById: session.user.id
      };
    }

    // Add date filters if provided
    if (start && end) {
      whereClause.AND = [
        {
          OR: [
            {
              startDate: {
                gte: start,
                lte: end
              }
            },
            {
              endDate: {
                gte: start,
                lte: end
              }
            },
            {
              AND: [
                { startDate: { lte: start } },
                { endDate: { gte: end } }
              ]
            }
          ]
        }
      ];
    } else if (start) {
      whereClause.startDate = { gte: start };
    } else if (end) {
      whereClause.endDate = { lte: end };
    }

    const events = await db.calendarEvent.findMany({
      where: whereClause,
      include: {
        bill: true,
        assignment: true,
        class: true,
        student: true,
        todos: session.user.role === 'STUDENT' ? {
          where: { teacherId: session.user.id } // Fix: use teacherId instead of userId
        } : false
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    // Format events with proper timezone handling
    const formattedEvents = events.map(event => {
      // For bills, ensure they show at 12:00 PM - 12:59 PM
      if (event.metadata && typeof event.metadata === 'object' && 
          'type' in event.metadata && event.metadata.type === 'bill') {
        
        const eventDate = new Date(event.startDate);
        
        // Set bill to 12:00 PM - 12:59 PM for visibility in week view
        const startDate = new Date(
          eventDate.getFullYear(),
          eventDate.getMonth(),
          eventDate.getDate(),
          12, 0, 0, 0
        );
        
        const endDate = new Date(
          eventDate.getFullYear(),
          eventDate.getMonth(),
          eventDate.getDate(),
          12, 59, 0, 0
        );

        return {
          ...event,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          metadata: {
            ...event.metadata,
            isDueAtNoon: true
          }
        };
      }
      
      // For other events, use their original times
      return {
        ...event,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString()
      };
    });

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    
    // For teacher users - preserve existing functionality
    if (session.user.role === 'TEACHER' || session.user.role === 'SUPER') {
      // Get teacher record
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher) {
        return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
      }

      // Validate class ownership if classId is provided
      if (data.metadata?.classId) {
        const classObj = await db.class.findFirst({
          where: {
            id: data.metadata.classId,
            teacherId: teacher.id
          }
        });

        if (!classObj) {
          return NextResponse.json({ error: "Class not found or you don't have permission" }, { status: 403 });
        }
      }

      // Validate assignment ownership if assignmentId is provided
      if (data.metadata?.assignmentId) {
        const assignment = await db.assignment.findFirst({
          where: {
            id: data.metadata.assignmentId,
            teacherId: teacher.id
          }
        });

        if (!assignment) {
          return NextResponse.json({ error: "Assignment not found or you don't have permission" }, { status: 403 });
        }
      }

      // Validate bill ownership if billId is provided
      if (data.metadata?.billId) {
        const bill = await db.bill.findFirst({
          where: {
            id: data.metadata.billId,
            creatorId: teacher.id
          }
        });

        if (!bill) {
          return NextResponse.json({ error: "Bill not found or you don't have permission" }, { status: 403 });
        }
      }

      // Create the event with all possible fields
      const event = await db.calendarEvent.create({
        data: {
          title: data.title,
          description: data.description,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          variant: data.variant || "primary",
          isRecurring: data.isRecurring === true,
          recurringDays: data.recurringDays || [],
          createdById: teacher.id, // Use teacher.id
          classId: data.metadata?.classId || null,
          billId: data.metadata?.billId || null,
          assignmentId: data.metadata?.assignmentId || null,
          metadata: {
            type: 'event', // Add this line to ensure regular events have type 'event'
            ...(data.metadata || {})
          }
        },
        include: {
          bill: true,
          assignment: true,
          class: true
        }
      });
      
      return NextResponse.json(event);
    }
    
    // For student users - limited functionality
    if (session.user.role === 'STUDENT') {
      // Find student profile
      const student = await db.student.findFirst({
        where: { 
          OR: [
            { userId: session.user.id },
            ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
          ]
        },
        select: { id: true, teacherId: true }
      });
      
      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }
      
      // Create todo first if this is a todo event
      let todoId = null;
      if (data.createTodo !== false) { // Default to creating todo unless explicitly disabled
        const todo = await db.todo.create({
          data: {
            title: data.title,
            dueDate: new Date(data.dueDate || data.startDate),
            priority: data.priority || "UPCOMING",
            teacherId: student.teacherId // Use teacherId from student record
          }
        });
        todoId = todo.id;
      }
      
      // Create a calendar event
      const event = await db.calendarEvent.create({
        data: {
          title: data.title,
          description: data.description,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          variant: data.variant || "primary",
          isRecurring: false, // Students can't create recurring events
          recurringDays: [],
          createdById: session.user.id, // Use session.user.id for students
          studentId: student.id,
          metadata: {
            type: data.createTodo !== false ? 'todo' : 'event', // Set type based on whether it's a todo
            ...(data.metadata || {})
          }
        },
        include: {
          student: true,
          ...(todoId ? {
            todos: {
              where: { id: todoId }
            }
          } : {})
        }
      });

      // Connect todo to calendar event if created
      if (todoId) {
        await db.calendarEvent.update({
          where: { id: event.id },
          data: {
            todos: {
              connect: { id: todoId }
            }
          }
        });
      }
      
      return NextResponse.json(event);
    }
    
    return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
  } catch (error) {
    console.error("Calendar POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}