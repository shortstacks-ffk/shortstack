import { NextResponse } from "next/server";
import { getAuthSession } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

export async function GET() {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the student profile
    const student = await db.student.findFirst({
      where: { userId: session.user.id },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }

    // Get all bank accounts for this student
    const accounts = await db.bankAccount.findMany({
      where: { studentId: student.id },
      select: {
        id: true,
        accountNumber: true, // Use accountNumber instead of name
        accountType: true,
        balance: true,
      },
      orderBy: [
        { accountType: 'asc' },
        { accountNumber: 'asc' } // Order by accountNumber instead of name
      ]
    });

    // Map accountType to type and create a display name for consistency with the frontend
    const mappedAccounts = accounts.map(account => ({
      ...account,
      type: account.accountType, // Map accountType to type
      name: account.accountType === 'CHECKING' ? 'Checking Account' : 'Savings Account', // Generate display name
    }));

    return NextResponse.json(mappedAccounts);
  } catch (error) {
    console.error("Error fetching student accounts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}