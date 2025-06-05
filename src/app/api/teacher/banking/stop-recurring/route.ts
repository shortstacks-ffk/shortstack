import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await request.json();
    
    if (!eventId) {
      return NextResponse.json({ 
        error: "Missing event ID" 
      }, { status: 400 });
    }

    // Find the calendar event
    const event = await db.calendarEvent.findUnique({
      where: {
        id: eventId
      },
      select: {
        id: true,
        title: true,
        createdById: true,
        metadata: true
      }
    });

    // Make sure the event exists and belongs to this teacher
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.createdById !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized to modify this event" }, { status: 403 });
    }

    // Delete the recurring event
    await db.calendarEvent.delete({
      where: {
        id: eventId
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Recurring transaction stopped successfully"
    });
  } catch (error) {
    console.error("Error stopping recurring transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}