import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    // Parse the URL to get query parameters
    const url = new URL(request.url);
    const studentId = url.searchParams.get('studentId');
    
    // Build the where clause
    let whereClause: any = {
      createdById: teacher.id, // Use teacher.id instead of session.user.id
      isRecurring: true,
    };
    
    // Add metadata filter for banking transactions
    if (studentId) {
      // Filter by specific student and transaction type
      whereClause.AND = [
        {
          metadata: {
            path: ['studentId'],
            equals: studentId
          }
        },
        {
          OR: [
            {
              metadata: {
                path: ['transactionType'],
                equals: 'ADD_FUNDS'
              }
            },
            {
              metadata: {
                path: ['transactionType'],
                equals: 'REMOVE_FUNDS'
              }
            }
          ]
        }
      ];
    } else {
      // When not filtering by studentId, get all banking transactions
      whereClause.OR = [
        {
          metadata: {
            path: ['transactionType'],
            equals: 'ADD_FUNDS'
          }
        },
        {
          metadata: {
            path: ['transactionType'],
            equals: 'REMOVE_FUNDS'
          }
        }
      ];
    }
    
    // Get the recurring transactions
    const recurringTransactions = await db.calendarEvent.findMany({
      where: whereClause,
      orderBy: {
        startDate: 'asc',
      },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        recurrenceType: true,
        recurrenceInterval: true,
        metadata: true,
      }
    });

    return NextResponse.json(recurringTransactions);
  } catch (error) {
    console.error("Error fetching recurring transactions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}