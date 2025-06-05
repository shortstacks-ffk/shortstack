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

    let whereClause: any = {
      createdById: session.user.id
    };

    if (session.user.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true }
      });

      if (student) {
        whereClause = {
          OR: [
            { createdById: session.user.id },
            { studentId: student.id }
          ]
        };
      }
    }

    if (start) {
      whereClause.startDate = { gte: start };
    }
    if (end) {
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
          where: { userId: session.user.id }
        } : false
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