import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const accountId = url.searchParams.get('accountId');
    const year = url.searchParams.get('year');
    
    if (!accountId || !year) {
      return NextResponse.json({ error: "Account ID and year are required" }, { status: 400 });
    }
    
    // Find account and verify teacher has access to student
    const account = await db.bankAccount.findUnique({
      where: { id: accountId },
      include: { 
        student: {
          include: { class: true }
        }
      }
    });
    
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    
    // Verify teacher has access to student's class
    const teacherHasAccess = await db.class.findFirst({
      where: {
        userId: session.user.id,
        code: account.student.classId
      }
    });
    
    if (!teacherHasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    // Find all available statements for this account and year
    const statements = await db.bankStatement.findMany({
      where: {
        accountId,
        year
      },
      select: {
        id: true,
        month: true,
        year: true,
        generatedAt: true
      },
      orderBy: {
        generatedAt: 'desc'
      }
    });
    
    return NextResponse.json({ statements });
    
  } catch (error) {
    console.error("Error getting available statements:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}