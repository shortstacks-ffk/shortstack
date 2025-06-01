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
import Link from 'next/link';
import { MoreHorizontal, FileEdit, Trash2, Send, Calendar, FileIcon, Clock } from 'lucide-react';
import { deleteAssignment } from '@/src/app/actions/assignmentActions';
import EditAssignmentDialog from './EditAssignmentDialog';
import AssignAssignmentDialog from './AssignAssignmentDialog';
import { AssignmentRecord } from '@/src/types/assignments';

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'N/A';
  
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Extract file extension from file type or URL
const getSimpleFileType = (fileType?: string, url?: string): string => {
  if (fileType) {
    // Remove any prefix like "application/" or "text/"
    const parts = fileType.split('/');
    const ext = parts[parts.length - 1];
    
    // Further simplify common extensions
    if (ext.includes('pdf')) return 'PDF';
    if (ext.includes('word') || ext.includes('doc')) return 'DOC';
    if (ext.includes('excel') || ext.includes('sheet')) return 'XLS';
    if (ext.includes('powerpoint') || ext.includes('presentation')) return 'PPT';
    if (ext.includes('image') || ext.includes('jpeg') || ext.includes('png')) return 'IMG';
    return ext.toUpperCase().substring(0, 3);
  }
  
  // Try to extract from URL if fileType isn't available
  if (url) {
    const urlParts = url.split('.');
    if (urlParts.length > 1) {
      return urlParts[urlParts.length - 1].toUpperCase().substring(0, 3);
    }
  }
  
  return 'FILE';
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
                  {assignment.url ? (
                    <Link 
                      href={assignment.url} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block"
                      title={assignment.name}
                    >
                      {assignment.name}
                    </Link>
                  ) : (
                    <span className="font-medium truncate block" title={assignment.name}>
                      {assignment.name}
                    </span>
                  )}
                  <div className="text-xs text-gray-500">
                    {getSimpleFileType(assignment.fileType, assignment.url)}
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
                    {formatFileSize(assignment.size)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
                    {assignment.url ? (
                      <Link 
                        href={assignment.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline break-words"
                      >
                        {assignment.name}
                      </Link>
                    ) : (
                      <h3 className="font-medium break-words">{assignment.name}</h3>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
                    <FileIcon className="h-3 w-3 mr-1" />
                    {getSimpleFileType(assignment.fileType, assignment.url)}
                  </div>
                  
                  <div className="bg-blue-100 px-2 py-1 rounded-full text-blue-700 text-xs inline-flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mr-1"></div>
                    {formatFileSize(assignment.size)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
          assignment={{
            ...assignmentToEdit,
            id: assignmentToEdit?.id || "",
            name: assignmentToEdit?.name || "",
            classId: assignmentToEdit?.classId || ""
          }}
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
          assignment={assignmentToAssign}
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
