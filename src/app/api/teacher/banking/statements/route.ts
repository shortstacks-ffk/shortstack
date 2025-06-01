import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");
    
    if (!accountId || !month || !year) {
      return NextResponse.json({ 
        error: "Account ID, month, and year are required" 
      }, { status: 400 });
    }

    // Find the account with its student to check teacher access
    const account = await db.bankAccount.findFirst({
      where: {
        id: accountId
      },
      include: {
        student: {
          include: {
            class: true
          }
        }
      }
    });
    
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    
    // Verify the teacher has access to this student's class
    const teacherHasAccess = await db.class.findFirst({
      where: {
        userId: session.user.id,
        code: account.student.classId
      }
    });
    
    if (!teacherHasAccess) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    // Check if a generated statement exists
    const statement = await db.bankStatement.findFirst({
      where: {
        accountId: account.id,
        month,
        year,
      }
    });
    
    if (!statement) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    // Redirect to the blob URL for download
    return NextResponse.redirect(statement.url);
    
  } catch (error) {
    console.error("Error retrieving statement:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}