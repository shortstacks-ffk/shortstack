import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/src/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get all classes for this teacher/user
    const classes = await db.class.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        code: true,
        emoji: true,
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json({ 
      classes: classes.map(cls => ({
        id: cls.id,
        name: cls.name,
        code: cls.code,
        emoji: cls.emoji,
        studentCount: cls._count.students
      }))
    });
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" }, 
      { status: 500 }
    );
  }
}