import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";

// Add more logging to help diagnose the issue

export async function GET(
  req: Request,
  context: { params: Promise<{ classId: string }> } 
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { classId } = await context.params;
    console.log("API: Fetching students for class ID:", classId);

    // Get the teacher record first
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    console.log("API: Teacher ID:", teacher.id);

    // Verify teacher owns the class using teacherId
    const classExists = await db.class.findFirst({
      where: {
        id: classId,
        teacherId: teacher.id,
      },
    });

    console.log("API: Class exists check:", !!classExists);

    if (!classExists) {
      return NextResponse.json({ error: "Class not found or access denied" }, { status: 403 });
    }

    // Get all students enrolled in the class with their bank accounts
    const students = await db.student.findMany({
      where: {
        enrollments: {
          some: {
            classId,
            enrolled: true,
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolEmail: true,
        userId: true,
        lastLogin: true, // Include lastLogin here
        bankAccounts: {
          select: {
            id: true,
            accountNumber: true,
            accountType: true,
            balance: true,
          },
        },
      },
    });

    // Format the student data for the frontend
    const formattedStudents = students.map((student) => {
      const checkingAccount = student.bankAccounts.find(
        (acc) => acc.accountType === "CHECKING"
      ) || { id: "", accountNumber: "", balance: 0 };
      
      const savingsAccount = student.bankAccounts.find(
        (acc) => acc.accountType === "SAVINGS"
      ) || { id: "", accountNumber: "", balance: 0 };

      // Use the actual lastLogin field from the student model instead of trying to get it from User
      const lastLogin = student.lastLogin 
        ? new Date(student.lastLogin).toLocaleDateString() 
        : "Never";

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.schoolEmail,
        lastLogin,
        checking: {
          id: checkingAccount.id,
          accountNumber: checkingAccount.accountNumber || "",
          balance: checkingAccount.balance || 0,
        },
        savings: {
          id: savingsAccount.id,
          accountNumber: savingsAccount.accountNumber || "",
          balance: savingsAccount.balance || 0,
        },
      };
    });

    return NextResponse.json(formattedStudents);
  } catch (error) {
    console.error("Error fetching student accounts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}