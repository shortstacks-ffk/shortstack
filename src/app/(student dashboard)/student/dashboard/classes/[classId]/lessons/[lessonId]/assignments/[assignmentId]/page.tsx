// 'use client';

// import { useState, useEffect } from 'react';
// import { notFound } from 'next/navigation';
// import Link from 'next/link';
// import { Button } from '@/src/components/ui/button';
// import { Badge } from '@/src/components/ui/badge';
// import { ArrowLeft, Calendar, Download, Upload, FileText, ExternalLink, Eye, Clock } from 'lucide-react';
// import { getSimpleFileType, formatFileSize } from '@/src/lib/utils';
// import AssignmentSubmitDialog from '@/src/components/students/AssignmentSubmitDialog';
// import { db } from '@/src/lib/db';
// import { getAuthSession } from '@/src/lib/auth';

// interface PageProps {
//   params: Promise<{ classId: string; lessonId: string; assignmentId: string }>;
// }

// // Client component for handling timezone formatting
// function DateTimeDisplay({ 
//   date, 
//   label, 
//   className = "" 
// }: { 
//   date: Date | string | null; 
//   label?: string;
//   className?: string;
// }) {
//   const [formattedDate, setFormattedDate] = useState<string>('');
//   const [timeAgo, setTimeAgo] = useState<string>('');

//   useEffect(() => {
//     if (!date) {
//       setFormattedDate('Not set');
//       setTimeAgo('');
//       return;
//     }

//     const dateObj = typeof date === 'string' ? new Date(date) : date;
    
//     // Format using user's local timezone
//     const formatted = dateObj.toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       timeZoneName: 'short'
//     });
    
//     setFormattedDate(formatted);

//     // Calculate time ago
//     const now = new Date();
//     const diffInMs = now.getTime() - dateObj.getTime();
//     const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
//     const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
//     const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

//     if (diffInDays > 0) {
//       if (diffInDays === 1) {
//         setTimeAgo('Yesterday');
//       } else if (diffInDays < 7) {
//         setTimeAgo(`${diffInDays} days ago`);
//       } else {
//         setTimeAgo('');
//       }
//     } else if (diffInHours > 0) {
//       setTimeAgo(`${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`);
//     } else if (diffInMinutes > 0) {
//       setTimeAgo(`${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`);
//     } else {
//       setTimeAgo('Just now');
//     }
//   }, [date]);

//   return (
//     <div className={`flex flex-col ${className}`}>
//       {label && <span className="text-sm font-medium text-gray-700 mb-1">{label}:</span>}
//       <span className="text-sm text-gray-900">{formattedDate}</span>
//       {timeAgo && <span className="text-xs text-gray-500">{timeAgo}</span>}
//     </div>
//   );
// }

// // Enhanced submission preview component
// function SubmissionPreview({ 
//   submission 
// }: { 
//   submission: any;
// }) {
//   const [showFullText, setShowFullText] = useState(false);

//   if (!submission) return null;

//   const getFileTypeDisplay = (fileType: string, fileName: string) => {
//     return getSimpleFileType(fileType, fileName);
//   };

//   return (
//     <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
//       <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
//         <Eye className="h-5 w-5" />
//         Your Submission
//       </h3>
      
//       {/* Submission metadata */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
//         <DateTimeDisplay 
//           date={submission.createdAt} 
//           label="Submitted"
//           className="p-3 bg-white rounded border"
//         />
//         <div className="p-3 bg-white rounded border">
//           <span className="text-sm font-medium text-gray-700 mb-1 block">Status:</span>
//           <Badge 
//             variant={submission.status === 'GRADED' ? 'default' : 'secondary'}
//             className="text-sm"
//           >
//             {submission.status.replace('_', ' ').toLowerCase()}
//           </Badge>
//         </div>
//       </div>

//       {/* File submission */}
//       {submission.fileUrl && (
//         <div className="mb-4 p-4 bg-white rounded border">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               <div className="p-3 bg-blue-100 rounded-lg">
//                 <FileText className="h-6 w-6 text-blue-600" />
//               </div>
//               <div>
//                 <p className="font-medium text-blue-900 mb-1">
//                   {submission.fileName || 'Submitted File'}
//                 </p>
//                 <div className="flex items-center gap-4 text-sm text-blue-700">
//                   {submission.fileType && (
//                     <span className="px-2 py-1 bg-blue-200 rounded text-xs font-medium">
//                       {getFileTypeDisplay(submission.fileType, submission.fileName)}
//                     </span>
//                   )}
//                   {submission.fileSize && (
//                     <span>{formatFileSize(submission.fileSize)}</span>
//                   )}
//                 </div>
//               </div>
//             </div>
//             <a 
//               href={submission.fileUrl}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
//             >
//               <ExternalLink className="h-4 w-4" />
//               View File
//             </a>
//           </div>
//         </div>
//       )}

//       {/* Text submission */}
//       {submission.textContent && (
//         <div className="mb-4 p-4 bg-white rounded border">
//           <p className="text-sm font-medium text-blue-900 mb-3">Text Submission:</p>
//           <div className="text-sm text-blue-800 p-3 bg-blue-25 rounded border">
//             {showFullText || submission.textContent.length <= 300 ? (
//               <p className="whitespace-pre-wrap leading-relaxed">{submission.textContent}</p>
//             ) : (
//               <>
//                 <p className="whitespace-pre-wrap leading-relaxed">
//                   {submission.textContent.substring(0, 300)}...
//                 </p>
//                 <button
//                   onClick={() => setShowFullText(true)}
//                   className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium border-b border-blue-600"
//                 >
//                   Show more
//                 </button>
//               </>
//             )}
//             {showFullText && submission.textContent.length > 300 && (
//               <button
//                 onClick={() => setShowFullText(false)}
//                 className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium border-b border-blue-600 block"
//               >
//                 Show less
//               </button>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Comments */}
//       {submission.comments && (
//         <div className="p-4 bg-white rounded border">
//           <p className="text-sm font-medium text-blue-900 mb-2">Your Comments:</p>
//           <p className="text-sm text-blue-800 whitespace-pre-wrap p-3 bg-blue-25 rounded border">
//             {submission.comments}
//           </p>
//         </div>
//       )}

//       {/* Teacher feedback if graded */}
//       {submission.status === 'GRADED' && submission.grade !== null && (
//         <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
//           <p className="text-sm font-medium text-green-900 mb-2">Teacher Feedback:</p>
//           <div className="flex items-center gap-4">
//             <div className="text-2xl font-bold text-green-600">
//               {submission.grade}%
//             </div>
//             {submission.comments && (
//               <p className="text-sm text-green-800 flex-1">
//                 {submission.comments}
//               </p>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // Main component - convert to async server component for data fetching
// export default async function StudentAssignmentPage({ params }: PageProps) {
//   try {
//     const { classId, lessonId, assignmentId } = await params;
    
//     console.log(`Loading assignment ${assignmentId} for student in class ${classId}`);
    
//     const session = await getAuthSession();
//     if (!session?.user?.id || session.user.role !== "STUDENT") {
//       console.error("Unauthorized access attempt");
//       notFound();
//     }

//     const student = await db.student.findFirst({
//       where: { 
//         OR: [
//           { userId: session.user.id },
//           ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
//         ]
//       }
//     });

//     if (!student) {
//       console.error("Student profile not found");
//       notFound();
//     }

//     const classData = await db.class.findUnique({
//       where: { code: classId },
//       select: { id: true, code: true, name: true }
//     });

//     if (!classData) {
//       console.error(`Class not found with code: ${classId}`);
//       notFound();
//     }

//     const enrollment = await db.enrollment.findFirst({
//       where: {
//         studentId: student.id,
//         classId: classData.id,
//         enrolled: true
//       }
//     });

//     if (!enrollment) {
//       console.error("Student not enrolled in this class");
//       notFound();
//     }

//     const lesson = await db.lessonPlan.findFirst({
//       where: {
//         id: lessonId,
//         classes: {
//           some: {
//             id: classData.id
//           }
//         }
//       }
//     });

//     if (!lesson) {
//       console.error("Lesson not found or not in this class");
//       notFound();
//     }

//     // Get assignment through lesson plan relationship
//     const assignment = await db.assignment.findFirst({
//       where: {
//         id: assignmentId,
//         lessonPlans: {
//           some: {
//             id: lessonId
//           }
//         }
//       },
//       include: {
//         lessonPlans: {
//           include: {
//             classes: {
//               select: {
//                 id: true,
//                 code: true,
//                 name: true
//               }
//             }
//           }
//         }
//       }
//     });

//     if (!assignment) {
//       console.error("Assignment not found or not connected to this lesson");
//       notFound();
//     }

//     // Verify access through lesson plan in this class
//     const hasAccess = assignment.lessonPlans.some(lp => 
//       lp.classes.some(cls => cls.id === classData.id)
//     );

//     if (!hasAccess) {
//       console.error("Assignment not accessible through this class");
//       notFound();
//     }

//     // Get submission
//     const submission = await db.studentAssignmentSubmission.findFirst({
//       where: {
//         assignmentId: assignment.id,
//         studentId: student.id
//       },
//       orderBy: {
//         updatedAt: 'desc'
//       }
//     });

//     console.log(`Assignment loaded: ${assignment.name}`);

//     // Pass serializable data to client component
//     const assignmentData = {
//       id: assignment.id,
//       name: assignment.name,
//       description: assignment.description,
//       textAssignment: assignment.textAssignment,
//       fileType: assignment.fileType,
//       activity: assignment.activity,
//       url: assignment.url,
//       dueDate: assignment.dueDate?.toISOString() || null,
//       createdAt: assignment.createdAt.toISOString(),
//       lessonPlans: assignment.lessonPlans.map(lp => ({
//         name: lp.name,
//         classes: lp.classes.map(c => ({
//           id: c.id,
//           code: c.code,
//           name: c.name
//         }))
//       }))
//     };

//     const submissionData = submission ? {
//       id: submission.id,
//       fileUrl: submission.fileUrl,
//       textContent: submission.textContent,
//       comments: submission.comments,
//       fileName: submission.fileName,
//       fileType: submission.fileType,
//       fileSize: submission.fileSize,
//       grade: submission.grade,
//       status: submission.status,
//       createdAt: submission.createdAt.toISOString(),
//       updatedAt: submission.updatedAt.toISOString()
//     } : null;

//     return (
//       <StudentAssignmentClient
//         assignment={assignmentData}
//         submission={submissionData}
//         classId={classId}
//         lessonId={lessonId}
//         assignmentId={assignmentId}
//       />
//     );
//   } catch (error: any) {
//     let classId = "unknown";
//     let lessonId = "unknown";
    
//     try {
//       const resolvedParams = await params;
//       classId = resolvedParams.classId;
//       lessonId = resolvedParams.lessonId;
//     } catch (paramsError) {
//       console.error("Failed to resolve params:", paramsError);
//     }
    
//     console.error("Error in StudentAssignmentPage:", error);
    
//     return (
//       <div className="container mx-auto p-6 text-center">
//         <div className="bg-destructive/10 text-destructive p-6 rounded-lg mb-6 max-w-md mx-auto">
//           <p className="font-medium text-lg mb-2">Failed to load assignment</p>
//           <p className="text-sm">{error?.message || "Unknown error occurred"}</p>
//         </div>
//         <div className="flex justify-center">
//           <a 
//             href={`/student/dashboard/classes/${classId}/lessons/${lessonId}`}
//             className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
//           >
//             ← Back to Lesson
//           </a>
//         </div>
//       </div>
//     );
//   }
// }

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