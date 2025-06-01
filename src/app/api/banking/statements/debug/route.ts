import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow access in development mode and for teachers
    if (process.env.NODE_ENV !== "development" || 
        !session?.user?.id || 
        session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get count of statements by month/year
    const statementCounts = await db.bankStatement.groupBy({
      by: ['accountId'],
      _count: {
        _all: true,
      },
    });
    
    return NextResponse.json({
      totalStatements: await db.bankStatement.count(),
      byMonthYear: statementCounts,
      recentStatements: await db.bankStatement.findMany({
        take: 10,
        orderBy: { generatedAt: 'desc' },
        select: {
          id: true,
          month: true,
          year: true,
          url: true,
          generatedAt: true,
          account: {
            select: {
              accountType: true
            }
          },
          student: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      })
    });
    
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}