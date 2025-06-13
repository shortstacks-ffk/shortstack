import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";

// Updated function signature with Promise params for latest Next.js
export async function GET(
  request: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    // Await the params Promise before using it
    const resolvedParams = await params;
    const billId = resolvedParams.billId;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    // Get the bill and verify ownership using new schema
    const bill = await db.bill.findFirst({
      where: {
        id: billId,
        OR: [
          { creatorId: teacher.id }, // Use teacherId instead of userId
          {
            class: {
              some: {
                teacherId: teacher.id // Use teacherId instead of userId
              }
            }
          }
        ]
      },
      include: {
        excludedStudents: {
          include: {
            enrollments: {
              include: {
                class: {
                  select: {
                    name: true,
                    id: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Format excluded students data with their class information
    const excludedStudents = bill.excludedStudents.map(student => {
      // Get the first enrolled class for display (students can be in multiple classes)
      const enrolledClass = student.enrollments.find(e => e.enrolled)?.class;
      
      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        firstName: student.firstName,
        lastName: student.lastName,
        schoolEmail: student.schoolEmail,
        className: enrolledClass?.name || 'No active class',
        classId: enrolledClass?.id || null
      };
    });

    return NextResponse.json(excludedStudents);
  } catch (error) {
    console.error("Error fetching excluded students:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}