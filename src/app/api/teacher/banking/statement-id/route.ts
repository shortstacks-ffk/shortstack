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
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');
    
    if (!accountId || !month || !year) {
      return NextResponse.json({ 
        error: "Account ID, month, and year are required" 
      }, { status: 400 });
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
    
    // Find the statement
    const statement = await db.bankStatement.findFirst({
      where: {
        accountId,
        month,
        year
      }
    });
    
    if (!statement) {
      return NextResponse.json({ exists: false });
    }
    
    return NextResponse.json({ 
      exists: true, 
      statementId: statement.id 
    });
    
  } catch (error) {
    console.error("Error checking statement:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}