import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";

export const dynamic = 'force-dynamic';

// Get a specific calendar event
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Access eventId from params (now using await)
    const params = await context.params;
    const { eventId } = params;
    
    // Authorization check based on role
    let event;
    
    if (session.user.role === "TEACHER" || session.user.role === "SUPER") {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher) {
        return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
      }

      event = await db.calendarEvent.findFirst({
        where: {
          id: eventId,
          createdById: teacher.id // Use teacher.id
        },
        include: {
          bill: true,
          assignment: true,
          class: true
        }
      });
    } else if (session.user.role === "STUDENT") {
      const student = await db.student.findFirst({
        where: { 
          OR: [
            { userId: session.user.id },
            ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
          ]
        },
        select: { id: true }
      });
      
      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }
      
      // Get enrolled class IDs
      const enrollments = await db.enrollment.findMany({
        where: {
          studentId: student.id,
          enrolled: true
        },
        select: { classId: true }
      });

      const enrolledClassIds = enrollments.map(e => e.classId);
      
      event = await db.calendarEvent.findFirst({
        where: {
          id: eventId,
          OR: [
            { createdById: session.user.id }, // Events created by student
            { studentId: student.id }, // Events specifically for this student
            ...(enrolledClassIds.length > 0 ? [{
              classId: { in: enrolledClassIds }
            }] : [])
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
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { eventId } = params;
    
    const data = await request.json();

    let createdById = session.user.id;
    
    // For teachers, use teacher.id as createdById
    if (session.user.role === "TEACHER" || session.user.role === "SUPER") {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher) {
        return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
      }
      
      createdById = teacher.id;
    }

    // Check if user can edit this event
    const existingEvent = await db.calendarEvent.findFirst({
      where: {
        id: eventId,
        createdById: createdById
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
      isRecurring: data.isRecurring === true,
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
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const params = await context.params;
    const { eventId } = params;

    let createdById = session.user.id;
    
    // For teachers, use teacher.id as createdById
    if (session.user.role === "TEACHER" || session.user.role === "SUPER") {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher) {
        return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
      }
      
      createdById = teacher.id;
    }
    
    // Check if user can delete this event with proper error logging
    const existingEvent = await db.calendarEvent.findFirst({
      where: {
        id: eventId,
        createdById: createdById
      }
    });

    console.log("Delete attempt:", {
      eventId,
      createdById,
      found: !!existingEvent
    });

    if (!existingEvent) {
      return NextResponse.json({ 
        error: "Event not found or you don't have permission to delete it" 
      }, { status: 404 });
    }

    // Delete the event
    await db.calendarEvent.delete({
      where: {
        id: eventId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete calendar event error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}