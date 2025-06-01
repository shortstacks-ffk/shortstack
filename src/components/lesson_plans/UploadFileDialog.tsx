import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { createFile } from '@/src/app/actions/fileActions';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Upload, X, FileIcon, FileText, FileImage, FileVideo } from 'lucide-react';
import { Progress } from '@/src/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

interface FileRecord {
  id: string;
  name: string;
  fileType?: string;
  activity?: string;
  createdAt?: string;
  size?: string | number;
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
  onFileUploaded,
}: {
  lessonPlanId: string;
  onFileUploaded: (file: FileRecord) => void;
}) {
  // Get classId from URL params
  const params = useParams();
  const classId = params.classId as string;
  
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('interactive');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size nicely
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
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
      setFile(droppedFile);
      
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!file || !name) {
      setError('Please provide a file name and select a file');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Create a FormData instance for the file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', name);
      formData.append('lessonPlanId', lessonPlanId);
      formData.append('classId', classId);
      formData.append('activity', activity);
      
      // Upload the file using fetch with progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/teacher/file/upload', true);
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });
      
      // Handle the response
      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = function() {
          reject(new Error('Network error occurred'));
        };
      });
      
      xhr.send(formData);
      const uploadData = await uploadPromise;
      
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'File upload failed');
      }
      
      // Create file record in database with the returned URL
      const res = await createFile({
        name,
        fileType: uploadData.fileType || file.type || 'application/octet-stream',
        activity,
        size: uploadData.size || file.size,
        url: uploadData.fileUrl || '',
        classId,
        lessonPlanIds: [lessonPlanId],
      });

      if (res.success) {
        toast.success("File uploaded successfully", {
          description: `${name} has been uploaded and added to the lesson plan.`,
          duration: 5000,
        });
        onFileUploaded(res.data);
        setOpen(false);
        setName('');
        setActivity('interactive');
        setFile(null);
      } else {
        setError(res.error || 'Failed to create file record');
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isUploading) {
        setOpen(isOpen);
        if (!isOpen) {
          setError(null);
          setFile(null);
          setUploadProgress(0);
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
        <div className="space-y-4">
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
                    Supports any file type (PDF, Word, Excel, images, videos, etc.)
                  </p>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
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
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
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
              onClick={() => setOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isUploading || !file}
              className="min-w-[90px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading
                </>
              ) : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}