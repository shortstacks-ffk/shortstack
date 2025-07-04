import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { getAuthSession } from '@/src/lib/auth';

// Update the GET handler to properly handle visibility schedules

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonPlanId: string }> }
) {
  try {
    // Await params before destructuring
    const resolvedParams = await params;
    const lessonPlanId = resolvedParams.lessonPlanId;
    const url = new URL(req.url);
    const includeVisibility = url.searchParams.get('includeVisibility') === 'true';
    
    // Add proper authentication
    const session = await getAuthSession();
    if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER")) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get teacher ID for query
    let teacherId: string;
    if (session.user.role === "TEACHER") {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!teacher) {
        return NextResponse.json(
          { error: 'Teacher profile not found' },
          { status: 404 }
        );
      }
      
      teacherId = teacher.id;
    } else {
      // For SUPER users, we'll still need a valid teacher ID
      const teacher = await db.teacher.findFirst({
        where: { userId: session.user.id }
      });
      
      if (!teacher) {
        return NextResponse.json(
          { error: 'Admin profile not found' },
          { status: 404 }
        );
      }
      
      teacherId = teacher.id;
    }
    
    // Fetch assignments with classVisibility relationship included
    const assignments = await db.assignment.findMany({
      where: {
        lessonPlans: {
          some: {
            id: lessonPlanId
          }
        },
        teacherId: teacherId
      },
      include: {
        classVisibility: true // Include the relationship
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // If visibility isn't needed, strip the classVisibility data
    if (!includeVisibility) {
      // Return assignments without the classVisibility data
      return NextResponse.json(assignments.map(({ classVisibility, ...rest }) => rest));
    }
    
    const now = new Date();
    
    // Process assignments to include visibility data in a flattened format
    const assignmentsWithVisibility = assignments.map((assignment) => {
      // Check if any class has this assignment set as visible AND the scheduled date is past
      const isVisible = assignment.classVisibility.length > 0 && 
                      assignment.classVisibility.some(record => {
                        // Check if record is marked as visible
                        if (!record.visibleToStudents) return false;
                        
                        // Check if there's a scheduled visibility date that's in the future
                        if (record.visibilityStartDate && new Date(record.visibilityStartDate) > now) {
                          return false;
                        }
                        
                        // If visible and either no schedule or schedule is in the past
                        return true;
                      });
      
      // Find the earliest due date from visibility records (prioritize ClassContentVisibility due dates)
      let effectiveDueDate = assignment.dueDate; // Start with the assignment's own due date
      
      if (assignment.classVisibility.length > 0) {
        // Consider visible records with due dates first
        const visibilityDueDates = assignment.classVisibility
          .filter(record => record.visibleToStudents && record.dueDate)
          .map(record => record.dueDate)
          .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime());
        
        if (visibilityDueDates.length > 0) {
          effectiveDueDate = visibilityDueDates[0]; // Use the earliest due date from visibility
        }
      }
      
      // Return a flattened object with visibility information
      const { classVisibility, ...assignmentData } = assignment;
      return {
        ...assignmentData,
        visibleToStudents: isVisible,
        dueDate: effectiveDueDate
      };
    });
    
    return NextResponse.json(assignmentsWithVisibility);
  } catch (error) {
    console.error('Error getting assignments:', error);
    return NextResponse.json(
      { error: 'Failed to get assignments' },
      { status: 500 }
    );
  }
}