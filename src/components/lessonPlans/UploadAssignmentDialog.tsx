'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { createAssignment } from '@/src/app/actions/assignmentActions';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { useState } from 'react';
import { Loader2, FileSpreadsheet, Upload, Type } from 'lucide-react';

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

// Dialog for creating an assignment
export default function UploadAssignmentDialog({
  lessonPlanId,
  onAssignmentUploaded,
  classId,
}: {
  lessonPlanId: string;
  onAssignmentUploaded: (assignment: AssignmentRecord) => void;
  classId: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('Homework');
  const [assignmentType, setAssignmentType] = useState<'file' | 'text'>('file');
  const [textAssignment, setTextAssignment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

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

    try {
      let url = '';
      let fileType = '';
      let size = 0;

      if (assignmentType === 'file' && file) {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);
        formData.append('lessonPlanId', lessonPlanId);
        formData.append('classId', classId);
        
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

      console.log('Creating assignment with classId:', classId);
      
      // Pass the date string directly without converting to Date object
      // The action will handle the timezone conversion properly
      const dueDateString = dueDate || undefined;
      
      // Create assignment record using our action
      const res = await createAssignment({
        name,
        activity,
        dueDate: dueDateString, // Pass as string, let the action handle conversion
        lessonPlanIds: [lessonPlanId],
        url: assignmentType === 'file' ? url : '',
        fileType: assignmentType === 'file' ? (fileType || '') : 'text',
        size: assignmentType === 'file' ? (size || 0) : textAssignment.length,
        textAssignment: assignmentType === 'text' ? textAssignment : undefined,
      });

      if (res.success) {
        onAssignmentUploaded(res.data);
        setOpen(false);
        setName('');
        setActivity('Homework');
        setAssignmentType('file');
        setTextAssignment('');
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

  const resetForm = () => {
    setName('');
    setActivity('Homework');
    setAssignmentType('file');
    setTextAssignment('');
    setDueDate('');
    setFile(null);
    setError(null);
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
          <FileSpreadsheet  className="mr-2 h-4 w-4" />
          Create Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input 
            placeholder="Assignment Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            disabled={isUploading}
          />

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
                Type Short
              </Button>
            </div>
          </div>
          
          {/* Conditional Content Based on Assignment Type */}
          {assignmentType === 'file' ? (
            <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <Upload  className="h-6 w-6 text-gray-400" />
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
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Assignment Text</label>
              <Textarea
                placeholder="Type your assignment instructions here..."
                value={textAssignment}
                onChange={(e) => setTextAssignment(e.target.value)}
                disabled={isUploading}
                className="min-h-[120px] resize-none"
                maxLength={1000}
              />
              <div className="text-xs text-gray-500 text-right">
                {textAssignment.length}/1000 characters
              </div>
            </div>
          )}
          
          {/* Activity Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Activity Type</label>
            <select 
              className="border border-gray-300 p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={activity} 
              onChange={(e) => setActivity(e.target.value)}
              disabled={isUploading}
            >
              {assignmentType === 'file' ? (
                <>
                  <option value="Homework">Homework</option>
                  <option value="Writing Assignment">Writing Assignment</option>
                  <option value="Worksheet">Worksheet</option>
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
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Due Date</label>
            <Input 
              type="date" 
              value={dueDate} 
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isUploading}
              min={today} // Prevent selecting past dates
            />
            {dueDate && new Date(dueDate) < new Date(today) && (
              <p className="text-red-500 text-xs">Please select a future date</p>
            )}
          </div>
          
          {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
          
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