import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Try multiple ways to find the student
    let student = await db.student.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
        ]
      }
    });
    
    // If not found, try one more approach as fallback
    if (!student && session.user.email) {
      student = await db.student.findUnique({
        where: { schoolEmail: session.user.email }
      });
    }
    
    if (!student) {
      console.error("Student record not found for user:", {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role
      });
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }
    
    // Return the necessary student info
    return NextResponse.json({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      schoolEmail: student.schoolEmail,
      profileImage: student.profileImage,
      // Include other fields as needed
    });
    
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}