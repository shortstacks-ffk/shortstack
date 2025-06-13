'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { ArrowLeft, Calendar, Download, Upload, FileText, ExternalLink, Eye, Clock } from 'lucide-react';
import { getSimpleFileType, formatFileSize } from '@/src/lib/utils';
import AssignmentSubmitDialog from '@/src/components/students/AssignmentSubmitDialog';

// Type definitions for props
interface AssignmentData {
  id: string;
  name: string;
  description?: string | null;
  textAssignment?: string | null;
  fileType?: string | null;
  activity?: string | null;
  url?: string | null;
  dueDate: string | null;
  createdAt: string;
  lessonPlans: Array<{
    name: string;
    classes: Array<{
      id: string;
      code: string;
      name: string;
    }>;
  }>;
}

interface SubmissionData {
  id: string;
  fileUrl?: string | null;
  textContent?: string | null;
  comments?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  grade?: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface StudentAssignmentClientProps {
  assignment: AssignmentData;
  submission: SubmissionData | null;
  classId: string;
  lessonId: string;
  assignmentId: string;
}

// Client component for handling timezone formatting
function DateTimeDisplay({ 
  date, 
  label, 
  className = "",
  showRelativeTime = true // Add this prop to control relative time display
}: { 
  date: string | null; 
  label?: string;
  className?: string;
  showRelativeTime?: boolean;
}) {
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!date) {
      setFormattedDate('Not set');
      setTimeAgo('');
      return;
    }

    const dateObj = new Date(date);
    
    // Format using user's local timezone
    const formatted = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    
    setFormattedDate(formatted);

    // Only calculate relative time if showRelativeTime is true
    if (!showRelativeTime) {
      setTimeAgo('');
      return;
    }

    // Calculate time ago (for submissions, creation dates, etc.)
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInDays > 0) {
      if (diffInDays === 1) {
        setTimeAgo('Yesterday');
      } else if (diffInDays < 7) {
        setTimeAgo(`${diffInDays} days ago`);
      } else {
        setTimeAgo('');
      }
    } else if (diffInHours > 0) {
      setTimeAgo(`${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`);
    } else if (diffInMinutes > 0) {
      setTimeAgo(`${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`);
    } else {
      setTimeAgo('Just now');
    }
  }, [date, showRelativeTime]);

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-sm font-medium text-gray-700 mb-1">{label}:</span>}
      <span className="text-sm text-gray-900">{formattedDate}</span>
      {timeAgo && <span className="text-xs text-gray-500">{timeAgo}</span>}
    </div>
  );
}

// Add a new component specifically for due dates
function DueDateDisplay({ 
  date, 
  className = "" 
}: { 
  date: string | null; 
  className?: string;
}) {
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [dueDateStatus, setDueDateStatus] = useState<string>('');

  useEffect(() => {
    if (!date) {
      setFormattedDate('No due date set');
      setDueDateStatus('');
      return;
    }

    const dateObj = new Date(date);
    
    // Format using user's local timezone
    const formatted = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    
    setFormattedDate(formatted);

    // Calculate due date status
    const now = new Date();
    const diffInMs = dateObj.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) {
      const overdueDays = Math.abs(diffInDays);
      setDueDateStatus(`${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`);
    } else if (diffInDays === 0) {
      setDueDateStatus('Due today');
    } else if (diffInDays === 1) {
      setDueDateStatus('Due tomorrow');
    } else if (diffInDays <= 7) {
      setDueDateStatus(`Due in ${diffInDays} days`);
    } else {
      setDueDateStatus(''); // Don't show status for far future dates
    }
  }, [date]);

  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-sm text-gray-900 font-medium">{formattedDate}</span>
      {dueDateStatus && (
        <span className={`text-xs mt-1 ${
          dueDateStatus.includes('overdue') ? 'text-red-600' :
          dueDateStatus.includes('today') ? 'text-orange-600' :
          dueDateStatus.includes('tomorrow') ? 'text-yellow-600' :
          'text-blue-600'
        }`}>
          {dueDateStatus}
        </span>
      )}
    </div>
  );
}

// Enhanced submission preview component
function SubmissionPreview({ 
  submission 
}: { 
  submission: SubmissionData;
}) {
  const [showFullText, setShowFullText] = useState(false);

  const getFileTypeDisplay = (fileType: string | null, fileName: string | null) => {
    if (!fileType || !fileName) return 'FILE';
    return getSimpleFileType(fileType, fileName);
  };

  return (
    <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
        <Eye className="h-5 w-5" />
        Your Submission
      </h3>
      
      {/* Submission metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <DateTimeDisplay 
          date={submission.createdAt} 
          label="Submitted"
          className="p-3 bg-white rounded border"
          showRelativeTime={true} // Keep relative time for submissions
        />
        <div className="p-3 bg-white rounded border">
          <span className="text-sm font-medium text-gray-700 mb-1 block">Status:</span>
          <Badge 
            variant={submission.status === 'GRADED' ? 'default' : 'secondary'}
            className="text-sm"
          >
            {submission.status.replace('_', ' ').toLowerCase()}
          </Badge>
        </div>
      </div>

      {/* File submission */}
      {submission.fileUrl && (
        <div className="mb-4 p-4 bg-white rounded border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900 mb-1">
                  {submission.fileName || 'Submitted File'}
                </p>
                <div className="flex items-center gap-4 text-sm text-blue-700">
                  {submission.fileType && (
                    <span className="px-2 py-1 bg-blue-200 rounded text-xs font-medium">
                      {getFileTypeDisplay(submission.fileType, (submission as any).fileName || null)}
                    </span>
                  )}
                  {submission.fileSize && (
                    <span>{formatFileSize(submission.fileSize)}</span>
                  )}
                </div>
              </div>
            </div>
            <a 
              href={submission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              View File
            </a>
          </div>
        </div>
      )}

      {/* Text submission */}
      {submission.textContent && (
        <div className="mb-4 p-4 bg-white rounded border">
          <p className="text-sm font-medium text-blue-900 mb-3">Text Submission:</p>
          <div className="text-sm text-blue-800 p-3 bg-blue-50 rounded border">
            {showFullText || submission.textContent.length <= 300 ? (
              <p className="whitespace-pre-wrap leading-relaxed">{submission.textContent}</p>
            ) : (
              <>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {submission.textContent.substring(0, 300)}...
                </p>
                <button
                  onClick={() => setShowFullText(true)}
                  className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium border-b border-blue-600"
                >
                  Show more
                </button>
              </>
            )}
            {showFullText && submission.textContent.length > 300 && (
              <button
                onClick={() => setShowFullText(false)}
                className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium border-b border-blue-600 block"
              >
                Show less
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comments */}
      {submission.comments && (
        <div className="p-4 bg-white rounded border">
          <p className="text-sm font-medium text-blue-900 mb-2">Your Comments:</p>
          <p className="text-sm text-blue-800 whitespace-pre-wrap p-3 bg-blue-50 rounded border">
            {submission.comments}
          </p>
        </div>
      )}

      {/* Teacher feedback if graded */}
      {submission.status === 'GRADED' && submission.grade !== null && (
        <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
          <p className="text-sm font-medium text-green-900 mb-2">Teacher Feedback:</p>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-green-600">
              {submission.grade}%
            </div>
            {submission.comments && (
              <p className="text-sm text-green-800 flex-1">
                {submission.comments}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main client component
export default function StudentAssignmentClient({
  assignment,
  submission,
  classId,
  lessonId,
  assignmentId
}: StudentAssignmentClientProps) {
  return (
    <main className="container mx-auto px-4 pb-20">
      <div className="mb-6 pt-4">
        <Link href={`/student/dashboard/classes/${classId}/lessons/${lessonId}`}>
          <Button variant="ghost" className="group pl-0">
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            <span>Back to Lesson</span>
          </Button>
        </Link>
      </div>
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
          {assignment.name}
        </h1>
        
        {/* Assignment metadata badges */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Badge variant="outline" className="flex items-center gap-2 px-3 py-1">
            <FileText className="h-4 w-4" />
            {assignment.fileType === 'text' 
              ? 'Text Assignment' 
              : getSimpleFileType(assignment.fileType || '', assignment.name)
            }
          </Badge>
          {assignment.activity && (
            <Badge variant="secondary" className="px-3 py-1">
              {assignment.activity}
            </Badge>
          )}
          {/* {assignment.dueDate && (
            <Badge variant="destructive" className="flex items-center gap-2 px-3 py-1">
              <Clock className="h-4 w-4" />
              Due Date Set
            </Badge>
          )} */}
        </div>
      </div>
      
      {/* Assignment Description */}
      {assignment.description && (
        <div className="bg-card rounded-lg border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Assignment Instructions
          </h2>
          <div 
            className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700" 
            dangerouslySetInnerHTML={{ __html: assignment.description }}
          />
        </div>
      )}

      {/* Text Assignment Content */}
      {assignment.textAssignment && (
        <div className="bg-card rounded-lg border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Assignment Content
          </h2>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {assignment.textAssignment}
            </p>
          </div>
        </div>
      )}
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Grade section - Restored original design */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Grade</h2>
            
            <div className="flex items-center">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <path
                    d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="3"
                    strokeDasharray={`${submission?.grade || 0}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-orange-500 text-2xl font-bold">{submission?.grade || 0}%</span>
                </div>
              </div>
              <div className="ml-6">
                <p className="text-orange-500 text-lg">{submission?.grade ? `Grade: ${submission.grade}%` : 'No grade yet.'}</p>
                {submission?.status && (
                  <Badge 
                    variant={submission.status === 'GRADED' ? 'default' : 'secondary'}
                    className="mt-2"
                  >
                    {submission.status.replace('_', ' ').toLowerCase()}
                  </Badge>
                )}
                {submission?.comments && submission.status === 'GRADED' && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Teacher Comments:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {submission.comments}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Submission section - Restored original design with light green buttons */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Submission</h2>
            
            {/* Show existing submission if any */}
            {submission && <SubmissionPreview submission={submission} />}
            
            <div className="flex flex-wrap gap-3">
              {assignment.url && (
                <a 
                  href={assignment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="no-underline"
                >
                  <Button variant="secondary" className="bg-lime-500 text-white hover:bg-lime-600">
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </a>
              )}
              
              {/* Submit/Resubmit assignment */}
              <AssignmentSubmitDialog 
                assignment={{
                  id: assignmentId,
                  name: assignment.name,
                  fileType: assignment.fileType,
                  dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null,
                  activity: assignment.activity || "Assignment",
                  url: assignment.url,
                  description: assignment.description,
                  textAssignment: assignment.textAssignment
                }}
              >
                <Button variant="secondary" className="bg-lime-500 text-white hover:bg-lime-600">
                  <Upload className="h-4 w-4 mr-2" /> 
                  {submission ? 'Resubmit Assignment' : 'Submit Assignment'}
                </Button>
              </AssignmentSubmitDialog>
            </div>
          </div>
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Due Date section */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Due Date
            </h3>
            
            <div className="p-4 bg-gray-50 rounded-lg border">
              <DueDateDisplay 
                date={assignment.dueDate} 
                className="text-center"
              />
            </div>
          </div>

          {/* Assignment Details */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Assignment Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">Activity Type:</span>
                <span className="font-medium text-right">{assignment.activity || 'Assignment'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">File Type:</span>
                <span className="font-medium text-right">
                  {assignment.fileType === 'text' 
                    ? 'Text Assignment' 
                    : getSimpleFileType(assignment.fileType || '', assignment.name)
                  }
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">Created:</span>
                <div className="text-right">
                  <DateTimeDisplay 
                    date={assignment.createdAt} 
                    showRelativeTime={true} // Keep relative time for creation date
                  />
                </div>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">Lesson:</span>
                <span className="font-medium text-right max-w-[60%]">
                  {assignment.lessonPlans[0]?.name || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}