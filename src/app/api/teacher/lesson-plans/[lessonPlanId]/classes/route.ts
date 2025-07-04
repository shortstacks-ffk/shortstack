import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { getAuthSession } from '@/src/lib/auth';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ lessonPlanId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: 'Unauthorized: Teachers only' }, { status: 401 });
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    // Fix: Correctly await the params Promise before accessing lessonPlanId
    const { lessonPlanId } = await context.params;
    console.log('Fetching classes for lesson plan:', lessonPlanId);

    if (!lessonPlanId) {
      return NextResponse.json({ error: 'Lesson plan ID is required' }, { status: 400 });
    }

    // Verify lesson plan belongs to this teacher
    const lessonPlan = await db.lessonPlan.findFirst({
      where: {
        id: lessonPlanId,
        teacherId: teacher.id
      },
      include: {
        classes: {
          select: {
            id: true,
            code: true,
            name: true,
            grade: true,
            emoji: true
          }
        }
      }
    });

    if (!lessonPlan) {
      return NextResponse.json({ error: 'Lesson plan not found or you do not have permission' }, { status: 404 });
    }

    console.log('Found classes:', lessonPlan.classes.length);
    
    // Return the classes associated with this lesson plan
    return NextResponse.json(lessonPlan.classes);
  } catch (error: any) {
    console.error('Error fetching lesson plan classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson plan classes' },
      { status: 500 }
    );
  }
}