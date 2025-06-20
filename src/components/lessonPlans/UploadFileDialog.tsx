'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Upload, X, FileIcon, FileText, FileImage, FileVideo } from 'lucide-react';
import { Progress } from '@/src/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { useSession } from 'next-auth/react';
import { upload } from '@vercel/blob/client';
import { type PutBlobResult, type UploadProgressEvent } from '@vercel/blob';
import { createFile } from '@/src/app/actions/fileActions';

interface FileRecord {
  id: string;
  name: string;
  fileType?: string;
  activity?: string;
  createdAt?: string;
  size?: string | number;
}

interface UploadFileDialogProps {
  lessonPlanId: string;
  isGeneric?: boolean;
  onFileUploaded?: (file: any) => void;
}

// Function to get appropriate icon based on file type
const getFileIcon = (fileType: string) => {
  if (fileType.includes('image')) return <FileImage className="h-6 w-6" />;
  if (fileType.includes('video')) return <FileVideo className="h-6 w-6" />;
  if (fileType.includes('text') || fileType.includes('pdf') || 
      fileType.includes('doc') || fileType.includes('xls')) return <FileText className="h-6 w-6" />;
  return <FileIcon className="h-6 w-6" />;
};

export default function UploadFileDialog({
  lessonPlanId,
  isGeneric = false,
  onFileUploaded,
}: UploadFileDialogProps) {
  // Get classId from URL params and session data
  const params = useParams();
  const classId = params.classId as string;
  const { data: session } = useSession();
  const isSuperUser = session?.user?.role === 'SUPER';
  
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('interactive');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [blob, setBlob] = useState<PutBlobResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      // Check file size (500MB limit)
      const MAX_SIZE = 500 * 1024 * 1024; // 500MB
      if (selectedFile.size > MAX_SIZE) {
        setError(`File is too large. Maximum size is 500MB.`);
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
      if (selectedFile.type.includes('image')) {
        setActivity('visual');
      } else if (selectedFile.type.includes('video')) {
        setActivity('video');
      } else if (selectedFile.type.includes('pdf') || 
                selectedFile.type.includes('document') || 
                selectedFile.type.includes('text')) {
        setActivity('document');
      } else if (selectedFile.type.includes('spreadsheet') || 
                selectedFile.type.includes('excel')) {
        setActivity('worksheet');
      } else if (selectedFile.type.includes('presentation')) {
        setActivity('presentation');
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
      
      // Check file size (500MB limit)
      const MAX_SIZE = 500 * 1024 * 1024; // 500MB
      if (droppedFile.size > MAX_SIZE) {
        setError(`File is too large. Maximum size is 500MB.`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !name) {
      setError('Please provide a file name and select a file');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      console.log('Starting Vercel client upload...');

      // First, get the teacher ID from the session to create the proper folder structure
      const tempPayload = {
        lessonPlanId: isGeneric && isSuperUser ? null : lessonPlanId,
        genericLessonPlanId: isGeneric && isSuperUser ? lessonPlanId : null,
        isGeneric: isGeneric && isSuperUser,
        activity: activity,
        fileName: name,
        fileSize: file.size
      };

      // Generate a unique filename with the user's provided name
      const fileExtension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
      const sanitizedFileName = name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-_]/g, '');
      const baseFileName = `${sanitizedFileName}-${Date.now()}${fileExtension}`;
      
      // Create the folder structure based on user type and lesson plan type
      let folderPath;
      if (isGeneric && isSuperUser) {
        folderPath = `super/generic-files`;
      } else if (isSuperUser) {
        folderPath = `super/lesson-files`;
      } else {
        folderPath = `teacher/lesson-files`;
      }
      
      const fullPathName = `${folderPath}/${baseFileName}`;
      
      console.log('Upload path will be:', fullPathName);

      // Upload using Vercel's client upload with the full path
      const newBlob = await upload(fullPathName, file, {
        access: 'public',
        handleUploadUrl: '/api/teacher/file/upload',
        clientPayload: JSON.stringify(tempPayload),
        onUploadProgress: (progressEvent: UploadProgressEvent) => {
          setUploadProgress(progressEvent.percentage);
          console.log(`Upload progress: ${progressEvent.percentage}%`);
        },
      });

      setBlob(newBlob);
      setUploadProgress(100);
      
      console.log('Upload completed successfully:', newBlob.url);
      console.log('Final blob pathname:', newBlob.pathname);
      
      // Now create the file record in the database using the createFile action
      console.log('Creating file record in database...');
      
      const fileData = {
        name: name,
        fileType: file.type,
        activity: activity,
        size: file.size,
        url: newBlob.url,
        // For generic lesson plans
        ...(isGeneric && isSuperUser && { genericLessonPlanIds: [lessonPlanId] }),
        // For regular lesson plans
        ...(!isGeneric && { lessonPlanIds: [lessonPlanId] })
      };

      const createResult = await createFile(fileData);
      
      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create file record');
      }
      
      console.log('File record created successfully:', createResult.data?.id);
      
      // Handle successful upload
      toast.success("File uploaded successfully", {
        description: `${name} has been uploaded and added to the lesson plan.`,
        duration: 5000,
      });
      
      // Call the onFileUploaded callback with the result
      if (onFileUploaded) {
        onFileUploaded({
          success: true,
          fileUrl: newBlob.url,
          fileId: createResult.data?.id,
          fileName: name,
          fileType: file.type,
          size: file.size,
          activity: activity,
          createdAt: new Date().toISOString()
        });
      }
      
      // Close dialog and reset form
      setOpen(false);
      setName('');
      setActivity('interactive');
      setFile(null);
      setBlob(null);
      
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setError(error.message || 'An unexpected error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  // Get status message based on upload progress
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
          setError(null);
          setFile(null);
          setUploadProgress(0);
          setName('');
          setActivity('interactive');
          setBlob(null);
        }
      }
    }}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 text-white hover:bg-orange-600" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">File Name</label>
            <Input 
              placeholder="File Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              disabled={isUploading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Activity Type</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={activity} 
              onChange={(e) => setActivity(e.target.value)}
              disabled={isUploading}
            >
              <option value="presentation">Presentation</option>
              <option value="document">Teaching file</option>
              <option value="worksheet">Worksheet</option>
              <option value="video">Video</option>
              <option value="visual">Photo</option>
            </select>
          </div>
          
          {file && file.size > 100 * 1024 * 1024 && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-3 text-sm">
              <p className="font-medium">Uploading large file ({formatFileSize(file.size)})</p>
              <p className="mt-1">
                Large files may take several minutes to upload. Please keep this window open and your device awake.
              </p>
            </div>
          )}
          
          {!file ? (
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
                    Supports any file type up to 500MB
                  </p>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  name="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  required
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
          )}
          
          {isUploading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{getUploadStatusMessage()}</span>
                <span className="text-blue-600 font-semibold">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-3" />
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="text-xs text-gray-500 text-center">
                  {file && `Uploading ${formatFileSize(file.size)} file...`}
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
              onClick={() => {
                if (!isUploading) {
                  setOpen(false);
                }
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isUploading || !file || !name}
              className="min-w-[90px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}