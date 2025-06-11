import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config"; 
import { db } from "@/src/lib/db";

// GET todos for the current user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate') as string) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate') as string) : undefined;
    const filter = searchParams.get('filter') || 'all'; // 'all', 'active', or 'completed'
    
    // Get the appropriate teacherId based on user role
    let teacherId = session.user.id; // Default for teacher users
    
    if (session.user.role === 'TEACHER') {
      // For teachers, get their teacher profile ID
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });
      
      if (!teacher) {
        return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
      }
      
      teacherId = teacher.id;
    } else if (session.user.role === 'STUDENT') {
      // For students, get their teacher's ID
      const student = await db.student.findFirst({
        where: { 
          OR: [
            { userId: session.user.id },
            ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
          ]
        },
        select: { teacherId: true }
      });
      
      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }
      
      teacherId = student.teacherId;
    }
    
    let whereClause: any = {
      teacherId: teacherId
    };
    
    // Add date filters if provided
    if (startDate) {
      whereClause.dueDate = { gte: startDate };
    }
    
    if (endDate) {
      whereClause.dueDate = { 
        ...whereClause.dueDate,
        lte: endDate 
      };
    }
    
    // Filter by completion status
    if (filter === 'active') {
      whereClause.completed = false;
    } else if (filter === 'completed') {
      whereClause.completed = true;
    }
    
    const todos = await db.todo.findMany({
      where: whereClause,
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      include: {
        calendarEvent: true
      }
    });
    
    return NextResponse.json(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create a new todo
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const data = await request.json();
    const { title, dueDate, priority, createEvent = false, description } = data;
    
    // Validation
    if (!title || !dueDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Get the appropriate teacherId based on user role
    let teacherId = session.user.id; // Default for teacher users
    let calendarEventCreatedById = session.user.id; // For calendar events, use user ID
    
    if (session.user.role === 'TEACHER') {
      // For teachers, get their teacher profile ID
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });
      
      if (!teacher) {
        return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
      }
      
      teacherId = teacher.id;
      calendarEventCreatedById = teacher.id; // Use teacher.id for calendar events
    } else if (session.user.role === 'STUDENT') {
      // For students, get their teacher's ID
      const student = await db.student.findFirst({
        where: { 
          OR: [
            { userId: session.user.id },
            ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
          ]
        },
        select: { teacherId: true }
      });
      
      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }
      
      teacherId = student.teacherId;
      // For student calendar events, keep using session.user.id
    }
    
    // Start a transaction to handle todo and optional calendar event creation
    const result = await db.$transaction(async (tx) => {
      let calendarEventId: string | undefined = undefined;
      
      // Create a calendar event if requested
      if (createEvent) {
        // Create a proper date object for correct timezone handling
        const dueDateObj = new Date(dueDate);
        
        // Set event end time to 30 minutes after start
        const endDate = new Date(dueDateObj);
        endDate.setMinutes(endDate.getMinutes() + 30);
        
        const variant = priority === 'URGENT' ? 'destructive' : 
                       priority === 'TODAY' ? 'primary' : 'success';
        
        // Make sure the dates are properly formatted for database insertion
        const event = await tx.calendarEvent.create({
          data: {
            title: title,
            description: `Todo: ${title}`,
            startDate: dueDateObj,
            endDate: endDate,
            variant,
            createdById: calendarEventCreatedById,
            metadata: {
              type: 'todo' // Add this line to ensure todo events have type 'todo'
            }
          }
        });
        
        calendarEventId = event.id;
      }
      
      // Create the todo
      const todo = await tx.todo.create({
        data: {
          title,
          completed: false,
          dueDate: new Date(dueDate), // Ensure this is a proper Date object
          priority: priority || 'UPCOMING',
          teacherId, // Use teacherId instead of userId
          calendarEventId,
        }
      });
      
      return { todo, calendarEventId };
    });
    
    return NextResponse.json({ 
      success: true, 
      todo: result.todo,
      calendarEventId: result.calendarEventId 
    });
  } catch (error) {
    console.error("Error creating todo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}