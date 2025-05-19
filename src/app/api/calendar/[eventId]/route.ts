import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";

// Get a specific calendar event
export async function GET(
  request: Request, 
  { params }: { params: { eventId: string }}
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Access eventId from params
    const { eventId } = params;
    
    // Authorization check based on role
    let event;
    
    if (session.user.role === "TEACHER") {
      event = await db.calendarEvent.findFirst({
        where: {
          id: eventId,
          createdById: session.user.id
        },
        include: {
          bill: true,
          assignment: true,
          class: true
        }
      });
    } else if (session.user.role === "STUDENT") {
      const student = await db.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true }
      });
      
      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }
      
      event = await db.calendarEvent.findFirst({
        where: {
          id: eventId,
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
        },
        include: {
          bill: true,
          assignment: true,
          class: true
        }
      });
    }
    
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    
    return NextResponse.json(event);
  } catch (error) {
    console.error("Get calendar event error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Update a calendar event
export async function PUT(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    // Get the session first before using it
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Access eventId from params
    const { eventId } = params;
    const data = await request.json();

    // Check if user can edit this event
    const existingEvent = await db.calendarEvent.findFirst({
      where: {
        id: eventId,
        createdById: session.user.id
      }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found or unauthorized" }, { status: 404 });
    }

    // Prepare update data with proper type handling
    const updateData = {
      title: data.title,
      description: data.description,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      variant: data.variant,
      isRecurring: data.isRecurring === true, // Ensure boolean
      recurringDays: Array.isArray(data.recurringDays) ? data.recurringDays : undefined
    };

    // Update the event
    const updatedEvent = await db.calendarEvent.update({
      where: { id: eventId },
      data: updateData
    });

    // If this event has children (student events), update those as well
    if (existingEvent.classId) {
      await db.calendarEvent.updateMany({
        where: { parentEventId: eventId },
        data: updateData
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedEvent 
    });
  } catch (error) {
    console.error("Update calendar event error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Delete a calendar event
export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Access eventId from params
    const { eventId } = await params;
    
    // Check if user can delete this event
    const existingEvent = await db.calendarEvent.findFirst({
      where: {
        id: eventId,
        createdById: session.user.id
      }
    });
    
    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found or unauthorized" }, { status: 404 });
    }
    
    // Delete child events if this is a parent event
    if (existingEvent.classId) {
      await db.calendarEvent.deleteMany({
        where: { parentEventId: eventId }
      });
    }
    
    // Delete the event
    await db.calendarEvent.delete({
      where: { id: eventId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete calendar event error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}