import { getAuthSession } from '@/src/lib/auth';
import { db } from '@/src/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
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

    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');
    const assignmentId = url.searchParams.get('assignmentId');

    if (!fileId && !assignmentId) {
      return NextResponse.json(
        { error: 'Either fileId or assignmentId is required' }, 
        { status: 400 }
      );
    }

    let lessonPlans;
    if (fileId) {
      // Get lesson plans for this file
      const file = await db.file.findFirst({
        where: { 
          id: fileId,
          teacherId: teacher.id
        },
        include: {
          lessonPlans: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!file) {
        return NextResponse.json({ error: 'File not found or you do not have permission' }, { status: 404 });
      }

      lessonPlans = file.lessonPlans;
    } else {
      // Get lesson plans for this assignment
      const assignment = await db.assignment.findFirst({
        where: { 
          id: assignmentId!,
          teacherId: teacher.id
        },
        include: {
          lessonPlans: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found or you do not have permission' }, { status: 404 });
      }

      lessonPlans = assignment.lessonPlans;
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        lessonPlans
      }
    });
  } catch (error: any) {
    console.error('Error fetching content lesson plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content information' }, 
      { status: 500 }
    );
  }
}