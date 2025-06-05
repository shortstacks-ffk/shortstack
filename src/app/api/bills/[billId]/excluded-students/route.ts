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

    // Get the bill and verify ownership
    const bill = await db.bill.findFirst({
      where: {
        id: billId,
        OR: [
          { creatorId: session.user.id },
          {
            class: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      },
      include: {
        excludedStudents: {
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
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Fix for the name property error
    const excludedStudents = bill.excludedStudents.map(student => ({
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      className: student.class?.name,
      classId: student.class?.id
    }));

    return NextResponse.json(excludedStudents);
  } catch (error) {
    console.error("Error fetching excluded students:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}