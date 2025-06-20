'use client';

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
  AlertDialogTitle 
} from '@/src/components/ui/alert-dialog';
import { deleteFile } from '@/src/app/actions/fileActions';
import { useState } from 'react';
import { MoreHorizontal, FileEdit, Trash2, Send, Calendar, FileIcon } from 'lucide-react';
import EditFileDialog from './EditFileDialog';
import AssignFileDialog from './AssignFileDialog';
import Link from 'next/link';
import { getSimpleFileType } from '@/src/lib/utils';
import { toast } from 'sonner';
import { FileRecord } from '@/src/types/file';

interface FileTableProps {
  files: FileRecord[];
  onUpdate?: () => void;
  canDelete?: boolean;
}

const formatFileSize = (bytes?: number | string): string => {
  if (!bytes) return 'N/A';
  
  const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  
  if (isNaN(numBytes) || numBytes <= 0) return 'N/A';
  
  if (numBytes < 1024) return `${numBytes} B`;
  if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
  return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch {
    return 'N/A';
  }
};

// Helper function to normalize file objects (handles both DB records and upload responses)
const normalizeFile = (file: FileRecord): FileRecord => {
  return {
    id: file.id || file.fileId || '', // Use id if available, fallback to fileId
    name: file.name || file.fileName || 'Unknown',
    fileType: file.fileType,
    activity: file.activity || 'interactive',
    createdAt: file.createdAt,
    size: file.size,
    url: file.url || file.fileUrl || '',
    classId: file.classId
  };
};

export default function FileTable({ 
  files, 
  onUpdate, 
  canDelete = true 
}: FileTableProps) {
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [fileToEdit, setFileToEdit] = useState<FileRecord | null>(null);
  const [fileToAssign, setFileToAssign] = useState<FileRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!fileToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteFile(fileToDelete);
      if (result.success) {
        toast.success("File deleted successfully");
        onUpdate?.();
      } else {
        toast.error(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error("An error occurred while deleting the file");
    } finally {
      setIsDeleting(false);
      setFileToDelete(null);
    }
  };

  // Ensure files is an array and normalize/filter valid entries
  const validFiles = Array.isArray(files) ? files
    .filter((file) => {
      if (!file) return false;
      
      // Check for either id or fileId (handles both DB records and upload responses)
      const hasId = file.id || file.fileId;
      if (!hasId) return false;
      
      // Check for either name or fileName
      const hasName = file.name || file.fileName;
      if (!hasName) return false;
      
      return true;
    })
    .map(normalizeFile) // Normalize all valid files
    : [];

  return (
    <>
      {/* Desktop View */}
      <div className="hidden sm:block w-full rounded-lg overflow-hidden border">
        {/* Header */}
        <div className="bg-gray-100 text-gray-800 p-4 grid grid-cols-4 font-medium">
          <div className="col-span-1">Name</div>
          <div className="col-span-1">Activity</div>
          <div className="col-span-1">Created</div>
          <div className="col-span-1 flex justify-between">
            <span>Size</span>
            <span>Actions</span>
          </div>
        </div>
        
        {/* File Rows - Desktop */}
        {validFiles.length === 0 ? (
          <div className="p-6 text-center text-gray-500 bg-white">
            <p>No files uploaded yet</p>
          </div>
        ) : (
          <div className="divide-y bg-white">
            {validFiles.map((file, index) => (
              <div key={`desktop-file-${file.id}-${index}`} className="hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-4 p-4 items-center">
                  <div className="col-span-1 min-w-0">
                    {file.url ? (
                      <Link 
                        href={file.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block"
                        title={file.name}
                      >
                        {file.name}
                      </Link>
                    ) : (
                      <span className="font-medium truncate block" title={file.name}>
                        {file.name}
                      </span>
                    )}
                    <div className="text-xs text-gray-500">
                      {getSimpleFileType ? getSimpleFileType(file.fileType, file.name) : (file.fileType || 'Unknown')}
                    </div>
                  </div>
                  <div className="col-span-1 truncate" title={file.activity || 'N/A'}>{file.activity || 'N/A'}</div>
                  <div className="col-span-1">{formatDate(file.createdAt)}</div>
                  <div className="col-span-1 flex justify-between items-center">
                    <div className="bg-blue-100 px-2 py-1 rounded-full text-blue-700 text-xs inline-flex items-center">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mr-1"></div>
                      {formatFileSize(file.size)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setFileToEdit(file)}>
                          <FileEdit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {canDelete && file.id && (
                          <DropdownMenuItem 
                            onClick={() => setFileToDelete(file.id!)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setFileToAssign(file)}>
                          <Send className="mr-2 h-4 w-4" />
                          Assign to Class
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile View */}
      <div className="sm:hidden w-full">
        {validFiles.length === 0 ? (
          <div className="p-4 text-center text-gray-500 bg-white border rounded-lg">
            <p>No files uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {validFiles.map((file, index) => (
              <div key={`mobile-file-${file.id}-${index}`} className="border rounded-lg p-3 bg-white shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 flex-1 pr-2">
                    {file.url ? (
                      <Link 
                        href={file.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline break-words"
                      >
                        {file.name}
                      </Link>
                    ) : (
                      <h3 className="font-medium break-words">{file.name}</h3>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setFileToEdit(file)}>
                        <FileEdit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {canDelete && file.id && (
                        <DropdownMenuItem 
                          onClick={() => setFileToDelete(file.id!)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setFileToAssign(file)}>
                        <Send className="mr-2 h-4 w-4" />
                        Assign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <div className="flex items-center">
                    <FileIcon className="h-3 w-3 mr-1" />
                    {getSimpleFileType ? getSimpleFileType(file.fileType, file.name) : (file.fileType || 'Unknown')}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(file.createdAt)}
                  </div>
                  <div className="bg-blue-100 px-2 py-1 rounded-full text-blue-700 text-xs inline-flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mr-1"></div>
                    {formatFileSize(file.size)}
                  </div>
                </div>
                
                {file.activity && (
                  <div className="mt-1 text-sm">
                    <span className="text-gray-500">Activity:</span> {file.activity}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={(isOpen) => !isOpen && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this file from both the database and cloud storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit File Dialog */}
      {fileToEdit && (
        <EditFileDialog
          file={fileToEdit as FileRecord}
          open={!!fileToEdit}
          onClose={() => setFileToEdit(null)}
          onUpdate={() => {
            onUpdate?.();
            setFileToEdit(null);
          }}
          onFileSaved={(file) => {
            onUpdate?.();
            setFileToEdit(null);
          }}
        />
      )}

      {/* Assign File Dialog */}
      {fileToAssign && (
        <AssignFileDialog
          file={fileToAssign as FileRecord}
          onFileAssigned={(file) => {
            onUpdate?.();
          }}
          onClose={() => {
            onUpdate?.();
            setFileToAssign(null);
          }}
        />
      )}
    </>
  );
}