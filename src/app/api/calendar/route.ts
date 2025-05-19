import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config"; // Updated import path
import { db } from "@/src/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const start = searchParams.get('start') ? new Date(searchParams.get('start') as string) : undefined;
    const end = searchParams.get('end') ? new Date(searchParams.get('end') as string) : undefined;
    
    let whereClause: any = {};
    
    // For teachers, show their created events and class events
    if (session.user.role === 'TEACHER') {
      whereClause = {
        OR: [
          { createdById: session.user.id },
          { class: { userId: session.user.id } }
        ]
      };
    } 
    // For students, show events related to their enrollments
    else if (session.user.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.user.id }
      });
      
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }
      
      whereClause = {
        OR: [
          { studentId: student.id },
          { 
            class: {
              enrollments: {
                some: {
                  studentId: student.id,
                  enrolled: true
                }
              }
            } 
          }
        ]
      };
    }
    
    // Add date filters if provided
    if (start) {
      whereClause.OR = whereClause.OR.map((clause: any) => ({
        ...clause,
        startDate: { gte: start }
      }));
    }
    
    if (end) {
      whereClause.OR = whereClause.OR.map((clause: any) => ({
        ...clause,
        endDate: { lte: end }
      }));
    }
    
    const events = await db.calendarEvent.findMany({
      where: whereClause,
      include: {
        bill: true,
        assignment: true,
        class: true,
        student: true
      }
    });

    // Format events for consumption by the calendar
    const formattedEvents = events.map((event) => {
      // Ensure recurringDays is always an array
      const recurringDays = Array.isArray(event.recurringDays)
        ? event.recurringDays
        : [];

      // Build comprehensive metadata
      const metadata = {
        type: event.billId
          ? "bill"
          : event.assignmentId
          ? "assignment"
          : event.classId
          ? "class"
          : "event",
        billId: event.billId || null,
        assignmentId: event.assignmentId || null,
        classId: event.classId || null,
        studentId: event.studentId || null,
        classColor: event.class?.color || null,
        dueDate: (event.billId && event.bill?.dueDate) || 
                 (event.assignmentId && event.assignment?.dueDate) || null,
      };

      // For bills and assignments, process dates in a predictable way
      let startDate: Date | string;
      let endDate: Date | string;
      
      // Modify the bill/assignment date handling in the GET route
if (event.billId && event.bill?.dueDate) {
  const dueDate = new Date(event.bill.dueDate);
  const utcNoon = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
    12, 0, 0
  );
  startDate = new Date(utcNoon).toISOString();
  endDate = new Date(utcNoon).toISOString();
} 
else if (event.assignmentId && event.assignment?.dueDate) {
  const dueDate = new Date(event.assignment.dueDate);
  const utcNoon = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
    12, 0, 0
  );
  startDate = new Date(utcNoon).toISOString();
  endDate = new Date(utcNoon).toISOString();
}
      else {
        // Use regular datetime objects for standard events
        startDate = new Date(event.startDate);
        endDate = new Date(event.endDate);
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description || "",
        startDate,
        endDate,
        variant: event.variant || "primary",
        isRecurring: !!event.isRecurring,
        recurringDays,
        metadata,
      };
    });

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create new calendar event
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { 
      title, 
      description, 
      startDate, 
      endDate, 
      variant, 
      isForClass, 
      classId,
      isRecurring,
      recurringDays = []
    } = data;
    
    // Validation
    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Create the main event
    const event = await db.calendarEvent.create({
      data: {
        title,
        description: description || "",
        startDate: startDate,
        endDate: endDate,
        variant: variant || "primary",
        isRecurring: isRecurring || false,
        recurringDays: recurringDays || [],
        createdById: session.user.id,
        classId: isForClass ? classId : null,
      }
    });
    
    // If this is a class event, create copies for all enrolled students
    if (isForClass && classId) {
      // Get all enrolled students in this class
      const enrollments = await db.enrollment.findMany({
        where: {
          classId,
          enrolled: true
        },
        select: {
          studentId: true
        }
      });
      
      // Create an event for each student
      for (const enrollment of enrollments) {
        await db.calendarEvent.create({
          data: {
            title,
            description: description || "",
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            variant: variant || "primary",
            isRecurring: isRecurring || false,
            recurringDays: recurringDays || [],
            createdById: session.user.id,
            classId,
            studentId: enrollment.studentId,
            parentEventId: event.id
          }
        });
      }
    }
    
    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}