import { notFound } from 'next/navigation';
import { db } from '@/src/lib/db';
import { getAuthSession } from '@/src/lib/auth';
import StudentAssignmentClient from './StudentAssignmentClient';

interface PageProps {
  params: Promise<{ classId: string; lessonId: string; assignmentId: string }>;
}

// Server component for data fetching
export default async function StudentAssignmentPage({ params }: PageProps) {
  try {
    const { classId, lessonId, assignmentId } = await params;
    
    console.log(`Loading assignment ${assignmentId} for student in class ${classId}`);
    
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "STUDENT") {
      console.error("Unauthorized access attempt");
      notFound();
    }

    const student = await db.student.findFirst({
      where: { 
        OR: [
          { userId: session.user.id },
          ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
        ]
      }
    });

    if (!student) {
      console.error("Student profile not found");
      notFound();
    }

    const classData = await db.class.findUnique({
      where: { code: classId },
      select: { id: true, code: true, name: true }
    });

    if (!classData) {
      console.error(`Class not found with code: ${classId}`);
      notFound();
    }

    const enrollment = await db.enrollment.findFirst({
      where: {
        studentId: student.id,
        classId: classData.id,
        enrolled: true
      }
    });

    if (!enrollment) {
      console.error("Student not enrolled in this class");
      notFound();
    }

    const lesson = await db.lessonPlan.findFirst({
      where: {
        id: lessonId,
        classes: {
          some: {
            id: classData.id
          }
        }
      }
    });

    if (!lesson) {
      console.error("Lesson not found or not in this class");
      notFound();
    }

    // Get assignment through lesson plan relationship
    const assignment = await db.assignment.findFirst({
      where: {
        id: assignmentId,
        lessonPlans: {
          some: {
            id: lessonId
          }
        }
      },
      include: {
        lessonPlans: {
          include: {
            classes: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!assignment) {
      console.error("Assignment not found or not connected to this lesson");
      notFound();
    }

    // Verify access through lesson plan in this class
    const hasAccess = assignment.lessonPlans.some(lp => 
      lp.classes.some(cls => cls.id === classData.id)
    );

    if (!hasAccess) {
      console.error("Assignment not accessible through this class");
      notFound();
    }

    // Get submission
    const submission = await db.studentAssignmentSubmission.findFirst({
      where: {
        assignmentId: assignment.id,
        studentId: student.id
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    console.log(`Assignment loaded: ${assignment.name}`);

    // Pass serializable data to client component
    const assignmentData = {
      id: assignment.id,
      name: assignment.name,
      description: assignment.description,
      textAssignment: assignment.textAssignment,
      fileType: assignment.fileType,
      activity: assignment.activity,
      url: assignment.url,
      dueDate: assignment.dueDate?.toISOString() || null,
      createdAt: assignment.createdAt.toISOString(),
      lessonPlans: assignment.lessonPlans.map(lp => ({
        name: lp.name,
        classes: lp.classes.map(c => ({
          id: c.id,
          code: c.code,
          name: c.name
        }))
      }))
    };

    const submissionData = submission ? {
      id: submission.id,
      fileUrl: submission.fileUrl,
      textContent: submission.textContent,
      comments: submission.comments,
      fileName: submission.fileName,
      fileType: submission.fileType,
      fileSize: submission.fileSize,
      grade: submission.grade,
      status: submission.status,
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString()
    } : null;

    return (
      <StudentAssignmentClient
        assignment={assignmentData}
        submission={submissionData}
        classId={classId}
        lessonId={lessonId}
        assignmentId={assignmentId}
      />
    );
  } catch (error: any) {
    let classId = "unknown";
    let lessonId = "unknown";
    
    try {
      const resolvedParams = await params;
      classId = resolvedParams.classId;
      lessonId = resolvedParams.lessonId;
    } catch (paramsError) {
      console.error("Failed to resolve params:", paramsError);
    }
    
    console.error("Error in StudentAssignmentPage:", error);
    
    return (
      <div className="container mx-auto p-6 text-center">
        <div className="bg-destructive/10 text-destructive p-6 rounded-lg mb-6 max-w-md mx-auto">
          <p className="font-medium text-lg mb-2">Failed to load assignment</p>
          <p className="text-sm">{error?.message || "Unknown error occurred"}</p>
        </div>
        <div className="flex justify-center">
          <a 
            href={`/student/dashboard/classes/${classId}/lessons/${lessonId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            ← Back to Lesson
          </a>
        </div>
      </div>
    );
  }
}