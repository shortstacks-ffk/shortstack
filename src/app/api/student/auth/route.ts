import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { schoolEmail, password } = await request.json();

    if (!schoolEmail || !password) {
      return NextResponse.json(
        { error: "Missng credentials" },
        { status: 400 }
      );
    }

    // Find the student by schoolEmail
    const student = await db.student.findUnique({
      where: { schoolEmail },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify provided password against the hashed password
    const isValid = await bcrypt.compare(password, student.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // If successful, you might want to sign a token or set a cookie.
    // For simplicity, we return success and student details.
    return NextResponse.json(
      { success: true, data: { studentId: student.id, schoolEmail: student.schoolEmail } },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Student auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}