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

    // Parse the URL to get query parameters
    const url = new URL(request.url);
    const studentId = url.searchParams.get('studentId');
    
    // Fix: Create a properly structured query that won't fail when empty
    let whereClause: any = {
      createdById: session.user.id,
      isRecurring: true,
    };
    
    // Add metadata filter only if we need to filter by student
    if (studentId) {
      whereClause = {
        ...whereClause,
        metadata: {
          path: ['studentId'],
          equals: studentId
        }
      };
    } else {
      // When not filtering by studentId, ensure we only get banking transactions
      whereClause = {
        ...whereClause,
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
      };
    }
    
    // Get the recurring transactions with the fixed query structure
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