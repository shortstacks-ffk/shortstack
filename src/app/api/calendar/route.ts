import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";
import { getUserTimeZone } from "@/src/lib/time-utils";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userTimeZone = request.headers.get('x-timezone') || 'UTC';

    const searchParams = new URL(request.url).searchParams;
    const start = searchParams.get('start') ? new Date(searchParams.get('start') as string) : undefined;
    const end = searchParams.get('end') ? new Date(searchParams.get('end') as string) : undefined;
    
    let whereClause: any = {};
    
    // For teachers, preserve existing query behavior
    if (session.user.role === 'TEACHER') {
      // Use the existing query logic for teachers
      whereClause = {
        OR: [
          { createdById: session.user.id },
          { class: { userId: session.user.id } }
        ]
      };
    } 
    // For students, implement new query logic
    else if (session.user.role === 'STUDENT') {
      try {
        // Try multiple ways to find the student profile (similar to getStudentClasses)
        let student = await db.student.findFirst({
          where: { 
            userId: session.user.id 
          },
          select: { id: true }
        });
        
        // If not found by userId, try by email
        if (!student && session.user.email) {
          student = await db.student.findFirst({
            where: { 
              schoolEmail: session.user.email 
            },
            select: { id: true }
          });
        }
        
        // If still not found, try directly by ID as a last resort
        if (!student) {
          student = await db.student.findUnique({
            where: { id: session.user.id },
            select: { id: true }
          });
        }

        if (!student) {
          console.error(`Student profile not found for user ${session.user.id} with email ${session.user.email}`);
          return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
        }
        
        // Get events for the student
        whereClause = {
          OR: [
            // Student's personal events
            { studentId: student.id },
            
            // Class events for enrolled classes
            { 
              classId: {
                in: await db.enrollment.findMany({
                  where: {
                    studentId: student.id,
                    enrolled: true
                  },
                  select: { classId: true }
                }).then(enrollments => enrollments.map(e => e.classId))
              }
            },
            
            // Bills assigned to the student
            {
              billId: {
                in: await db.studentBill.findMany({
                  where: {
                    studentId: student.id
                  },
                  select: { billId: true }
                }).then(bills => bills.map(b => b.billId))
              }
            },
            
            // Assignments for the student's classes
            {
              assignmentId: {
                in: await db.assignment.findMany({
                  where: {
                    classId: {
                      in: await db.enrollment.findMany({
                        where: {
                          studentId: student.id,
                          enrolled: true
                        },
                        select: { classId: true }
                      }).then(enrollments => enrollments.map(e => e.classId))
                    }
                  },
                  select: { id: true }
                }).then(assignments => assignments.map(a => a.id))
              }
            },
            
            // Todos created by the student
            {
              todos: {
                some: {
                  userId: session.user.id
                }
              }
            }
          ]
        };
      } catch (error) {
        console.error("Error building student calendar query:", error);
        return NextResponse.json({ error: "Failed to build student calendar query" }, { status: 500 });
      }
    }
    
    // Add date filters if provided - preserve existing functionality
    if (start) {
      whereClause.startDate = { gte: start };
    }
    
    if (end) {
      whereClause.endDate = { lte: end };
    }
    
    console.log("Calendar query for role:", session.user.role);
    
    const events = await db.calendarEvent.findMany({
      where: whereClause,
      include: {
        bill: true,
        assignment: true,
        class: true,
        student: true,
        todos: session.user.role === 'STUDENT' ? {
          where: { userId: session.user.id }
        } : false
      }
    });

    // Format events for consumption by the calendar - preserve existing formatter
    const formattedEvents = events.map((event) => {
      // Basic event data
      const formattedEvent: any = {
        id: event.id,
        title: event.title,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        variant: event.variant || "primary",
        isRecurring: event.isRecurring,
        recurringDays: event.recurringDays || [],
        metadata: {
          type: "event"
        }
      };
      
      // Add specific metadata based on event type
      if (event.billId && event.bill) {
        formattedEvent.metadata = {
          type: "bill",
          billId: event.billId,
          dueDate: event.bill?.dueDate?.toISOString(),
          status: event.bill?.status
        };
      } else if (event.assignmentId && event.assignment) {
        formattedEvent.metadata = {
          type: "assignment",
          assignmentId: event.assignmentId,
          classId: event.assignment?.classId,
          dueDate: event.assignment?.dueDate?.toISOString()
        };
      } else if (event.todos && event.todos.length > 0) {
        formattedEvent.metadata = {
          type: "todo",
          todoId: event.todos[0].id,
          priority: event.todos[0].priority,
          completed: event.todos[0].completed
        };
      } else if (event.classId && event.class) {
        formattedEvent.metadata = {
          type: "class",
          classId: event.classId,
          className: event.class?.name,
          emoji: event.class?.emoji
        };
      }
      
      return formattedEvent;
    });

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error("Calendar GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// For POST, ensure we maintain teacher functionality while adding student limitations
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    
    // For teacher users - preserve existing functionality
    if (session.user.role === 'TEACHER') {
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
          createdById: session.user.id,
          classId: data.metadata?.classId,
          billId: data.metadata?.billId,
          assignmentId: data.metadata?.assignmentId
        }
      });
      
      return NextResponse.json(event);
    }
    
    // For student users - limited functionality
    if (session.user.role === 'STUDENT') {
      // Find student profile
      const student = await db.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true }
      });
      
      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }
      
      // Students can only create todo events
      // First create the todo
      const todo = await db.todo.create({
        data: {
          title: data.title,
          dueDate: new Date(data.dueDate || data.startDate),
          priority: data.priority || "UPCOMING",
          userId: session.user.id
        }
      });
      
      // Then create a calendar event linked to the todo
      const event = await db.calendarEvent.create({
        data: {
          title: data.title,
          description: data.description,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          variant: data.variant || "primary",
          isRecurring: false, // Students can't create recurring events
          createdById: session.user.id,
          studentId: student.id,
          todos: {
            connect: {
              id: todo.id
            }
          }
        }
      });
      
      return NextResponse.json({
        ...event,
        todo
      });
    }
    
    return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
  } catch (error) {
    console.error("Calendar POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}