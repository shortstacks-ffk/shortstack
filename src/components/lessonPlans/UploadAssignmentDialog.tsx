'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { createAssignment, addAssignmentToGenericLessonPlan } from '@/src/app/actions/assignmentActions';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { useState, useRef, useCallback } from 'react';
import { Loader2, FileSpreadsheet, Upload, Type, X, FileText, FileImage, FileVideo, FileIcon } from 'lucide-react';
import { Progress } from '@/src/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { useSession } from 'next-auth/react';
import { upload } from '@vercel/blob/client';
import { type PutBlobResult, type UploadProgressEvent } from '@vercel/blob';

interface AssignmentRecord {
  id: string;
  name: string;
  fileType?: string;
  activity?: string;
  createdAt?: string;
  dueDate?: string;
  size?: string | number;
  file?: File;
  url?: string;
}

// Function to get appropriate icon based on file type
const getFileIcon = (fileType: string) => {
  if (fileType.includes('image')) return <FileImage className="h-6 w-6" />;
  if (fileType.includes('video')) return <FileVideo className="h-6 w-6" />;
  if (fileType.includes('text') || fileType.includes('pdf') || 
      fileType.includes('doc') || fileType.includes('xls')) return <FileText className="h-6 w-6" />;
  return <FileIcon className="h-6 w-6" />;
};

// Dialog for creating an assignment
export default function UploadAssignmentDialog({
  lessonPlanId,
  onAssignmentUploaded,
  classId,
  isGeneric = false 
}: {
  lessonPlanId: string;
  onAssignmentUploaded: (assignment: AssignmentRecord) => void;
  classId?: string;
  isGeneric?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('Homework');
  const [assignmentType, setAssignmentType] = useState<'file' | 'text'>('file');
  const [textAssignment, setTextAssignment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [blob, setBlob] = useState<PutBlobResult | null>(null);
  const [uploadPhase, setUploadPhase] = useState<'not-started' | 'uploading' | 'processing' | 'complete'>('not-started');
  
  const { data: session } = useSession();
  const isSuperUser = session?.user?.role === 'SUPER';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  // Format file size nicely
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check file size (250MB limit)
      const MAX_SIZE = 250 * 1024 * 1024; // 250MB
      if (selectedFile.size > MAX_SIZE) {
        setError(`File is too large. Maximum size is 250MB.`);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      // Auto-fill name from file name if empty
      if (!name) {
        const fileName = selectedFile.name.includes('.')
          ? selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'))
          : selectedFile.name;
        setName(fileName);
      }
      
      // Auto-select activity based on file type
      if (selectedFile.type.includes('pdf') || 
         selectedFile.type.includes('document') || 
         selectedFile.type.includes('text')) {
        setActivity('Writing Assignment');
      } else if (selectedFile.type.includes('spreadsheet') || 
                selectedFile.type.includes('excel')) {
        setActivity('Worksheet');
      } else {
        setActivity('Homework');
      }
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Check file size (250MB limit)
      const MAX_SIZE = 250 * 1024 * 1024; // 250MB
      if (droppedFile.size > MAX_SIZE) {
        setError(`File is too large. Maximum size is 250MB.`);
        return;
      }
      
      setFile(droppedFile);
      setError(null);
      
      // Auto-fill name from file name if empty
      if (!name) {
        const fileName = droppedFile.name.includes('.')
          ? droppedFile.name.substring(0, droppedFile.name.lastIndexOf('.'))
          : droppedFile.name;
        setName(fileName);
      }
    }
  }, [name]);

  const removeSelectedFile = () => {
    setFile(null);
    setError(null);
    setBlob(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setName('');
    setActivity('Homework');
    setAssignmentType('file');
    setTextAssignment('');
    setFile(null);
    setError(null);
    setUploadProgress(0);
    setBlob(null);
    setUploadPhase('not-started');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      setError('Please provide an assignment name');
      return;
    }

    if (assignmentType === 'text' && !textAssignment.trim()) {
      setError('Please provide assignment text');
      return;
    }

    if (assignmentType === 'file' && !file) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    setUploadPhase('uploading');

    try {
      let url = '';
      let fileType = '';
      let size = 0;

      if (assignmentType === 'file' && file) {
        console.log('Starting Vercel client upload for assignment...');
        
        // Create unique filename and folder structure
        const fileExtension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
        const sanitizedFileName = name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-_]/g, '');
        const baseFileName = `${sanitizedFileName}-${Date.now()}${fileExtension}`;
        
        // Determine folder path based on user role and lesson plan type
        let folderPath;
        if (isSuperUser) {
          folderPath = 'super/assignments';
        } else {
          folderPath = isGeneric ? 'generic-assignments' : 'teacher/assignments';
        }
        
        const fullPathName = `${folderPath}/${lessonPlanId}/${baseFileName}`;
        
        console.log('Assignment upload path will be:', fullPathName);
        
        // Upload metadata for client payload
        const clientPayload = {
          lessonPlanId,
          // Only include classId if it's provided and it's not a generic lesson plan
          ...(classId && !isGeneric ? { classId } : {}), 
          isGeneric,
          fileName: name,
          fileSize: file.size
        };

        try {
          // Upload file to Vercel Blob storage
          const newBlob = await upload(fullPathName, file, {
            access: 'public',
            handleUploadUrl: '/api/teacher/assignment/upload',
            clientPayload: JSON.stringify(clientPayload),
            onUploadProgress: (progressEvent: UploadProgressEvent) => {
              setUploadProgress(progressEvent.percentage);
              console.log(`Assignment upload progress: ${progressEvent.percentage}%`);
              
              if (progressEvent.percentage >= 100) {
                setUploadPhase('processing');
              }
            },
          });

          setBlob(newBlob);
          setUploadProgress(100);
          setUploadPhase('complete');
          
          console.log('Assignment upload completed successfully:', newBlob.url);
          
          url = newBlob.url;
          fileType = file.type;
          size = file.size;
        } catch (uploadError: any) {
          console.error('Error during file upload:', uploadError);
          throw new Error(uploadError.message || 'File upload failed');
        }
      }

      // Create the assignment record
      setUploadPhase('processing');
      
      if (isGeneric && isSuperUser) {
        // For templates (super users only)
        const result = await addAssignmentToGenericLessonPlan(lessonPlanId, {
          name,
          fileType: assignmentType === 'file' ? (fileType || file?.type || 'application/octet-stream') : 'text',
          activity,
          size: assignmentType === 'file' ? (size || file?.size || 0) : 0,
          url: assignmentType === 'file' ? url : '',
          textAssignment: assignmentType === 'text' ? textAssignment : undefined,
          description: ''
        });
        
        if (result.success) {
          setUploadPhase('complete');
          onAssignmentUploaded(result.data);
          toast.success('Assignment added to template successfully');
          resetForm();
          setOpen(false);
        } else {
          throw new Error(result.error || 'Failed to add assignment to template');
        }
      } else {
        // For regular lesson plans
        let lessonPlanIds: string[] = [lessonPlanId];
        
        const result = await createAssignment({
          name,
          fileType: assignmentType === 'file' ? (fileType || file?.type || 'application/octet-stream') : 'text',
          activity,
          lessonPlanIds,
          size: assignmentType === 'file' ? (size || file?.size || 0) : 0,
          url: assignmentType === 'file' ? url : '',
          textAssignment: assignmentType === 'text' ? textAssignment : undefined,
          description: ''
        });
        
        // After successful assignment creation:
        if (result.success) {
          setUploadPhase('complete');
          
          // Ensure visibility records exist for all classes
          if (!isGeneric && lessonPlanId) {
            try {
              // Check if the lesson plan has any classes
              const lessonPlanResponse = await fetch(`/api/teacher/lesson-plans/${lessonPlanId}/classes`);
              if (lessonPlanResponse.ok) {
                const classesData = await lessonPlanResponse.json();
                
                if (classesData && classesData.length > 0) {
                  // Log the classes that were found
                  console.log(`Found ${classesData.length} classes for this lesson plan`);
                  
                  // Instead of calling an undefined function, create visibility records through an API call
                  try {
                    const visibilityResponse = await fetch('/api/teacher/content-visibility', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contentType: 'assignment',
                        contentId: result.data.id,
                        classIds: classesData.map((c: any) => c.id),
                        lessonPlanId
                      })
                    });
                    
                    if (visibilityResponse.ok) {
                      console.log('Visibility records created successfully');
                    }
                  } catch (visErr) {
                    console.error('Error creating visibility records:', visErr);
                    // Non-critical error, don't throw
                  }
                } else {
                  console.log('No classes assigned to this lesson plan yet');
                }
              }
            } catch (err) {
              console.error('Failed to check lesson plan classes:', err);
            }
          }
          
          onAssignmentUploaded(result.data);
          toast.success('Assignment created successfully');
          resetForm();
          setOpen(false);
        } else {
          throw new Error(result.error || 'Failed to create assignment');
        }
      }
    } catch (error: any) {
      console.error('Assignment upload error:', error);
      setError(error.message || 'Failed to upload assignment');
      setUploadPhase('not-started');
    } finally {
      setIsUploading(false);
    }
  };

  // Get status message based on upload phase and progress
  const getUploadStatusMessage = () => {
    if (uploadProgress === 0) return "Initializing upload...";
    if (uploadProgress >= 100) return "Upload complete! Processing...";
    
    // For very large files, provide more detailed messages
    if (file && file.size > 100 * 1024 * 1024) { // > 100MB
      if (uploadProgress < 10) return "Starting upload (large file - this may take a while)...";
      if (uploadProgress < 25) return "Uploading... (25% complete)";
      if (uploadProgress < 50) return "Uploading... (halfway there)";
      if (uploadProgress < 75) return "Uploading... (75% complete)";
      if (uploadProgress < 90) return "Almost finished...";
      if (uploadProgress < 100) return "Finalizing upload...";
      return "Processing file...";
    }
    
    // For smaller files
    if (uploadProgress < 25) return "Uploading...";
    if (uploadProgress < 50) return "Uploading... (25% complete)";
    if (uploadProgress < 75) return "Uploading... (50% complete)";
    if (uploadProgress < 90) return "Uploading... (75% complete)";
    if (uploadProgress < 100) return "Almost done...";
    return "Processing...";
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isUploading) {
        setOpen(isOpen);
        if (!isOpen) {
          resetForm();
        }
      }
    }}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 text-white hover:bg-orange-600" size="sm">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Create Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Assignment Name</label>
            <Input 
              placeholder="Assignment Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              disabled={isUploading}
            />
          </div>

          {/* Assignment Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Assignment Type</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={assignmentType === 'file' ? 'default' : 'outline'}
                onClick={() => setAssignmentType('file')}
                disabled={isUploading}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
              <Button
                type="button"
                variant={assignmentType === 'text' ? 'default' : 'outline'}
                onClick={() => setAssignmentType('text')}
                disabled={isUploading}
                className="flex-1"
              >
                <Type className="mr-2 h-4 w-4" />
                Text Entry
              </Button>
            </div>
          </div>
          
          {/* File size warning for large files */}
          {file && file.size > 100 * 1024 * 1024 && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-3 text-sm">
              <p className="font-medium">Uploading large file ({formatFileSize(file.size)})</p>
              <p className="mt-1">
                Large files may take several minutes to upload. Please keep this window open and your device awake.
              </p>
            </div>
          )}
          
          {/* Conditional Content Based on Assignment Type */}
          {assignmentType === 'file' ? (
            !file ? (
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400",
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <Upload className="h-10 w-10 text-gray-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Drag and drop your file here or click to browse
                    </p>
                    <p className="text-xs text-gray-500">
                      Supports any file type up to 250MB
                    </p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    required={assignmentType === 'file'}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Select File
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.type)}
                    <div>
                      <p className="font-medium line-clamp-1">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className="h-8 w-8 p-0 rounded-full"
                    onClick={removeSelectedFile}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Assignment Text</label>
              <Textarea
                placeholder="Type your assignment instructions here..."
                value={textAssignment}
                onChange={(e) => setTextAssignment(e.target.value)}
                disabled={isUploading}
                className="min-h-[120px] resize-none"
                maxLength={5000}
              />
              <div className="text-xs text-gray-500 text-right">
                {textAssignment.length}/5000 characters
              </div>
            </div>
          )}
          
          {/* Activity Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Activity Type</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={activity} 
              onChange={(e) => setActivity(e.target.value)}
              disabled={isUploading}
            >
              {assignmentType === 'file' ? (
                <>
                  <option value="Homework">Homework</option>
                  <option value="Writing Assignment">Writing Assignment</option>
                  <option value="Worksheet">Worksheet</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Test">Test</option>
                </>
              ) : (
                <>
                  <option value="Short Answer">Short Answer</option>
                  <option value="Discussion Question">Discussion Question</option>
                  <option value="Reflection">Reflection</option>
                  <option value="Quick Task">Quick Task</option>
                  <option value="Reading Response">Reading Response</option>
                </>
              )}
            </select>
          </div>
          
          {isUploading && assignmentType === 'file' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{getUploadStatusMessage()}</span>
                {uploadPhase === 'uploading' && (
                  <span className="text-blue-600 font-semibold">{uploadProgress}%</span>
                )}
              </div>
              {uploadPhase === 'uploading' ? (
                <Progress value={uploadProgress} className="h-3" />
              ) : uploadPhase === 'processing' ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 text-blue-500" />
                  <span className="text-sm font-medium">Creating assignment...</span>
                </div>
              ) : null}
              {uploadPhase === 'uploading' && uploadProgress > 0 && uploadProgress < 100 && file && (
                <div className="text-xs text-gray-500 text-center">
                  Uploading {formatFileSize(file.size)} file...
                </div>
              )}
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="secondary" 
              type="button"
              size="sm" 
              onClick={() => {
                if (!isUploading) {
                  setOpen(false);
                  resetForm();
                }
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              size="sm" 
              disabled={isUploading || (!textAssignment && assignmentType === 'text') || (!file && assignmentType === 'file') || !name}
              className="min-w-[100px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadPhase === 'uploading' 
                    ? 'Uploading...' 
                    : uploadPhase === 'processing' 
                      ? 'Creating...' 
                      : 'Processing...'}
                </>
              ) : 'Create Assignment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}