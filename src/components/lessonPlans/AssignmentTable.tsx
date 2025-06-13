'use client';

import { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/src/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import Link from 'next/link';
import { MoreHorizontal, FileEdit, Trash2, Send, Calendar, FileIcon, Clock, FileText, Eye } from 'lucide-react';
import { deleteAssignment } from '@/src/app/actions/assignmentActions';
import EditAssignmentDialog from './EditAssignmentDialog';
import AssignAssignmentDialog from './AssignAssignmentDialog';
import { AssignmentRecord } from '@/src/types/assignments';
import { getSimpleFileType } from '@/src/lib/utils';

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'N/A';
  
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Update the formatDate function
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  // Format with local timezone
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function AssignmentTable({ 
  assignments, 
  onUpdate 
}: { 
  assignments: AssignmentRecord[],
  onUpdate?: () => void 
}) {
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [assignmentToEdit, setAssignmentToEdit] = useState<AssignmentRecord | null>(null);
  const [assignmentToAssign, setAssignmentToAssign] = useState<AssignmentRecord | null>(null);
  const [textAssignmentToView, setTextAssignmentToView] = useState<AssignmentRecord | null>(null);
  
  const handleDelete = async () => {
    if (!assignmentToDelete) return;
    
    try {
      const result = await deleteAssignment(assignmentToDelete);
      if (result.success) {
        onUpdate?.();
      }
    } catch (error) {
      console.error('Failed to delete assignment:', error);
    } finally {
      setAssignmentToDelete(null);
    }
  };

  // Function to render assignment name with appropriate link or text display
  const renderAssignmentName = (assignment: AssignmentRecord) => {
    // If it's a text assignment, make it clickable to view content
    if (assignment.fileType === 'text' && assignment.textAssignment) {
      return (
        <div>
          <button
            onClick={() => setTextAssignmentToView(assignment)}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
            title="Click to view text assignment"
          >
            {assignment.name}
          </button>
          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
            {assignment.textAssignment.substring(0, 100)}...
          </div>
        </div>
      );
    }
    
    // If it has a file URL, make it a downloadable link
    if (assignment.url && assignment.url.trim() !== '') {
      return (
        <Link 
          href={assignment.url} 
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block"
          title={assignment.name}
        >
          {assignment.name}
        </Link>
      );
    }
    
    // Default: just show the name
    return (
      <span className="font-medium truncate block" title={assignment.name}>
        {assignment.name}
      </span>
    );
  };

  // Function to get the appropriate file type display
  const getAssignmentTypeDisplay = (assignment: AssignmentRecord) => {
    if (assignment.fileType === 'text') {
      return 'Text Assignment';
    }
    return getSimpleFileType(assignment.fileType, assignment.url);
  };

  return (
    <>
      {/* Desktop View */}
      <div className="hidden sm:block w-full rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-100 text-gray-800 p-4 grid grid-cols-5 font-medium">
          <div className="col-span-1">Name</div>
          <div className="col-span-1">Activity</div>
          <div className="col-span-1">Created</div>
          <div className="col-span-1">Due Date</div>
          <div className="col-span-1 flex justify-between">
            <span>Size</span>
            <span>Actions</span>
          </div>
        </div>
        
        {/* Assignment Rows - Desktop */}
        {assignments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No assignments available
          </div>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="border-b hover:bg-gray-50 transition-colors">
              <div className="grid grid-cols-5 p-4 items-center">
                <div className="col-span-1 min-w-0">
                  {renderAssignmentName(assignment)}
                  <div className="text-xs text-gray-500">
                    {getAssignmentTypeDisplay(assignment)}
                  </div>
                </div>
                <div className="col-span-1 truncate" title={assignment.activity}>
                  {assignment.activity || 'N/A'}
                </div>
                <div className="col-span-1">{formatDate(assignment.createdAt || assignment.dueDate)}</div>
                <div className="col-span-1">{formatDate(assignment.dueDate)}</div>
                <div className="col-span-1 flex justify-between items-center">
                  <div className="bg-blue-100 px-2 py-1 rounded-full text-blue-700 text-xs flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mr-1"></div>
                    {assignment.fileType === 'text' ? 
                      `${(assignment.textAssignment?.length || assignment.size || 0)} chars` : 
                      formatFileSize(typeof assignment.size === 'string' ? parseInt(assignment.size) || 0 : assignment.size)
                    }
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {assignment.fileType === 'text' && assignment.textAssignment && (
                        <DropdownMenuItem onClick={() => setTextAssignmentToView(assignment)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Text
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setAssignmentToEdit(assignment)}>
                        <FileEdit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAssignmentToDelete(assignment.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAssignmentToAssign(assignment)}>
                        <Send className="mr-2 h-4 w-4" />
                        Assign to Plans
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Mobile View */}
      <div className="sm:hidden w-full">
        {assignments.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No assignments available
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="border rounded-lg p-3 bg-white shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 flex-1 pr-2">
                    {renderAssignmentName(assignment)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {assignment.fileType === 'text' && assignment.textAssignment && (
                        <DropdownMenuItem onClick={() => setTextAssignmentToView(assignment)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Text
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setAssignmentToEdit(assignment)}>
                        <FileEdit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAssignmentToDelete(assignment.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAssignmentToAssign(assignment)}>
                        <Send className="mr-2 h-4 w-4" />
                        Assign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {assignment.activity && (
                  <div className="mt-1 text-sm">
                    <span className="text-gray-500">Activity:</span> {assignment.activity}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                  {assignment.dueDate && (
                    <div className="flex items-center text-amber-600">
                      <Calendar className="h-3 w-3 mr-1" />
                      Due: {formatDate(assignment.dueDate)}
                    </div>
                  )}
                  
                  <div className="flex items-center text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    Created: {formatDate(assignment.createdAt || assignment.dueDate)}
                  </div>
                </div>

                <div className="flex items-center mt-2 gap-3">
                  <div className="flex items-center text-xs text-gray-500">
                    {assignment.fileType === 'text' ? (
                      <FileText className="h-3 w-3 mr-1" />
                    ) : (
                      <FileIcon className="h-3 w-3 mr-1" />
                    )}
                    {getAssignmentTypeDisplay(assignment)}
                  </div>
                  
                  <div className="bg-blue-100 px-2 py-1 rounded-full text-blue-700 text-xs inline-flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mr-1"></div>
                    {assignment.fileType === 'text' ? 
                      `${(assignment.textAssignment?.length || assignment.size || 0)} chars` : 
                      formatFileSize(typeof assignment.size === 'string' ? parseInt(assignment.size) || 0 : assignment.size)
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Text Assignment Viewer Dialog */}
      <Dialog 
        open={!!textAssignmentToView} 
        onOpenChange={(isOpen) => !isOpen && setTextAssignmentToView(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {textAssignmentToView?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {textAssignmentToView?.activity && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Activity:</span>
                <span>{textAssignmentToView.activity}</span>
              </div>
            )}
            {textAssignmentToView?.dueDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Due:</span>
                <span>{formatDate(textAssignmentToView.dueDate)}</span>
              </div>
            )}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Assignment Instructions:</h3>
              <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                {textAssignmentToView?.textAssignment}
              </div>
            </div>
            <div className="text-xs text-gray-500 text-right">
              {textAssignmentToView?.textAssignment?.length || 0} characters
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!assignmentToDelete} 
        onOpenChange={(isOpen) => !isOpen && setAssignmentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this assignment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Assignment Dialog */}
      {assignmentToEdit && (
        <EditAssignmentDialog
          assignment={assignmentToEdit}
          isOpen={!!assignmentToEdit}
          onClose={() => setAssignmentToEdit(null)}
          onUpdate={() => {
            onUpdate?.();
            setAssignmentToEdit(null);
          }}
        />
      )}

      {/* Assign Assignment Dialog */}
      {assignmentToAssign && (
        <AssignAssignmentDialog
          assignment={{
            ...assignmentToAssign,
            size: typeof assignmentToAssign.size === 'string' ? parseInt(assignmentToAssign.size) || 0 : assignmentToAssign.size
          }}
          isOpen={!!assignmentToAssign}
          onClose={() => setAssignmentToAssign(null)}
          onUpdate={() => {
            onUpdate?.();
            setAssignmentToAssign(null);
          }}
        />
      )}
    </>
  );
}
