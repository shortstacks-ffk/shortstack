import { getAuthSession } from '@/src/lib/auth';
import { db } from '@/src/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ lessonPlanId: string }> }
) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Await params before using
    const { lessonPlanId } = await params;
    
    // Find the teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }
    
    // Verify teacher owns this lesson plan
    const lessonPlan = await db.lessonPlan.findFirst({
      where: {
        id: lessonPlanId,
        teacherId: teacher.id
      },
      include: {
        classes: {
          select: { id: true }
        }
      }
    });
    
    if (!lessonPlan) {
      return NextResponse.json({ error: 'Lesson plan not found or you do not have permission' }, { status: 404 });
    }
    
    // Get IDs of classes that already have this lesson plan
    const assignedClassIds = lessonPlan.classes.map(c => c.id);
    
    // Get all classes owned by this teacher that don't already have this lesson plan
    const availableClasses = await db.class.findMany({
      where: { 
        teacherId: teacher.id,
        id: {
          notIn: assignedClassIds.length > 0 ? assignedClassIds : undefined
        }
      },
      select: {
        id: true,
        name: true,
        code: true,
        emoji: true,
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    // Format response to match what the dialog expects
    const formattedClasses = availableClasses.map(cls => ({
      id: cls.id,
      name: cls.name,
      code: cls.code,
      emoji: cls.emoji,
      studentCount: cls._count.enrollments
    }));
    
    return NextResponse.json(formattedClasses);
  } catch (error) {
    console.error('API error fetching available classes:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}