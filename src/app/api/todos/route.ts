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
    
    let whereClause: any = {
      userId: session.user.id
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
            createdById: session.user.id
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
          userId: session.user.id,
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