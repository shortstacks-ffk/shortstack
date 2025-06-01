import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { createAssignment } from '@/src/app/actions/assignmentActions';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';

interface AssignmentRecord {
  id: string;
  name: string;
  fileType?: string;
  activity?: string;  // Changed from activityType to match schema
  createdAt?: string;
  dueDate?: string;
  size?: string | number;
  file?: File;
  url?: string;
}

// Dialog for uploading an assignment
export default function UploadAssignmentDialog({
  lessonPlanId,
  onAssignmentUploaded,
  classId, // Add this prop
}: {
  lessonPlanId: string;
  onAssignmentUploaded: (assignment: AssignmentRecord) => void;
  classId: string; // Add this type
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('Homework');  // Changed from 'interactive' to 'Homework'
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!name) {
        // Auto-fill name from file name if empty
        setName(e.target.files[0].name.split('.')[0]);
      }
    }
  };

  const handleSubmit = async () => {
    if (!name) {
      setError('Please provide an assignment name');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Upload file first if provided
      let url = '';
      let fileType = '';
      let size = 0;

      if (file) {
        // Create a FormData instance
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);
        formData.append('lessonPlanId', lessonPlanId);
        formData.append('classId', classId);
        
        // Upload the file to the new API
        const uploadRes = await fetch('/api/teacher/assignment/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadRes.ok) {
          throw new Error('Failed to upload file');
        }
        
        const uploadData = await uploadRes.json();
        
        if (!uploadData.success) {
          throw new Error(uploadData.error || 'File upload failed');
        }
        
        url = uploadData.fileUrl;
        fileType = uploadData.fileType;
        size = uploadData.size;
      }

      console.log('Creating assignment with classId:', classId); // Add debugging
      
      // Create assignment record using our action
      const res = await createAssignment({
        name,
        activity,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        classId,
        lessonPlanIds: [lessonPlanId],
        url, // Add the file URL if uploaded
        fileType: fileType || '',
        size: size || 0,
      });

      if (res.success) {
        onAssignmentUploaded(res.data);
        setOpen(false);
        setName('');
        setActivity('Homework');
        setDueDate('');
        setFile(null);
      } else {
        setError(res.error || 'Failed to create assignment');
      }
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isUploading) {
        setOpen(isOpen);
        if (!isOpen) {
          setError(null);
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
          <DialogTitle>Create Assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input 
            placeholder="Assignment Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            disabled={isUploading}
          />
          
          {/* File Upload Component */}
          <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
            <label className="flex flex-col items-center gap-2 cursor-pointer">
              <Upload className="h-6 w-6 text-gray-400" />
              <span className="text-sm text-gray-600">
                {file ? file.name : 'Click to upload assignment file'}
              </span>
              <Input 
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                disabled={isUploading} 
              />
            </label>
            {file && (
              <div className="mt-2 text-xs text-gray-500">
                Size: {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>
          
          <select 
            className="border p-2 w-full rounded" 
            value={activity} 
            onChange={(e) => setActivity(e.target.value)}
            disabled={isUploading}
          >
            <option value="Homework">Homework</option>
            <option value="Writing Assignment">Writing Assignment</option>
            <option value="Worksheet">Worksheet</option>
          </select>
          
          <Input 
            type="date" 
            value={dueDate} 
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isUploading} 
          />
          
          {error && <div className="text-red-500 text-sm">{error}</div>}
          
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit} 
              disabled={isUploading}
              className="min-w-[80px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating
                </>
              ) : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}