// Import the visibility helper
import { isContentVisibleToStudents } from '@/src/lib/visibility';
import { db } from '@/src/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/src/lib/auth';

// Create a proper GET function
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    // Authentication checks
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: "Unauthorized. Students only." },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const classId = resolvedParams.classId;
    
    // Verify the student is enrolled in this class
    const student = await db.student.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
        ]
      }
    });
    
    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }
    
    const enrollment = await db.enrollment.findFirst({
      where: {
        classId,
        studentId: student.id,
        enrolled: true
      }
    });
    
    if (!enrollment) {
      return NextResponse.json(
        { error: "You are not enrolled in this class" },
        { status: 403 }
      );
    }

    // Get all lesson plans for this class
    const lessonPlans = await db.lessonPlan.findMany({
      where: {
        classes: {
          some: {
            id: classId
          }
        }
      },
      include: {
        files: true,
        assignments: true
      }
    });

    // Get all visibility settings for this class
    const visibilitySettings = await db.classContentVisibility.findMany({
      where: { classId }
    });

    // Filter files and assignments based on visibility
    const filteredLessonPlans = lessonPlans.map(plan => {
      // Filter files to only show visible ones
      const visibleFiles = plan.files.filter(file => {
        const fileSetting = visibilitySettings.find(
          setting => setting.fileId === file.id
        );
        return isContentVisibleToStudents(fileSetting);
      });
      
      // Filter assignments to only show visible ones
      const visibleAssignments = plan.assignments.filter(assignment => {
        const assignmentSetting = visibilitySettings.find(
          setting => setting.assignmentId === assignment.id
        );
        return isContentVisibleToStudents(assignmentSetting);
      });
      
      // Return lesson plan with filtered content
      return {
        ...plan,
        files: visibleFiles,
        assignments: visibleAssignments
      };
    });

    return NextResponse.json(filteredLessonPlans);
  } catch (error) {
    console.error("Error fetching lesson plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson plans" },
      { status: 500 }
    );
  }
}