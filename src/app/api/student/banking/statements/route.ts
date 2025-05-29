import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
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

    // Find the student record for the authenticated user
    const student = await db.student.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
        ]
      }
    });
    
    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    // Verify account belongs to the current student
    const account = await db.bankAccount.findFirst({
      where: {
        id: accountId,
        studentId: student.id,
      }
    });
    
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check if a generated statement exists in the database
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