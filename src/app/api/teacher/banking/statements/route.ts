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
    
    // Get teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
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
            enrollments: {
              include: {
                class: true
              }
            }
          }
        }
      }
    });
    
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    
    // Verify the teacher has access to this student through enrollment
    const teacherHasAccess = account.student.enrollments.some(enrollment => 
      enrollment.class.teacherId === teacher.id && enrollment.enrolled
    );
    
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