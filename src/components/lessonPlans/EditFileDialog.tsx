'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { useState } from 'react';
import { updateFile } from '@/src/app/actions/fileActions';
import { Loader2 } from 'lucide-react';

interface FileRecord {
  id: string;
  name: string;
  fileType?: string;
  activity?: string;
  size?: number | string;
  url?: string;
  classId: string;
}

interface EditFileDialogProps {
  file: FileRecord;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

// File activity options
const fileActivityOptions = [
  { label: 'Interactive', value: 'interactive' },
  { label: 'Presentation', value: 'presentation' },
  { label: 'Document', value: 'document' },
  { label: 'Video', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: 'Worksheet', value: 'worksheet' },
  { label: 'Reading Material', value: 'reading' },
  { label: 'Reference', value: 'reference' },
  { label: 'Template', value: 'template' },
  { label: 'Other', value: 'other' }
];

export default function EditFileDialog({ file, isOpen, onClose, onUpdate }: EditFileDialogProps) {
  const [name, setName] = useState(file.name);
  const [activity, setActivity] = useState(file.activity || 'interactive');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please provide a file name');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      // Ensure all required fields are provided with proper defaults
      const updateData = {
        name: name.trim(),
        fileType: file.fileType || 'application/octet-stream', // Provide default
        activity,
        size: typeof file.size === 'number' ? file.size : (parseInt(String(file.size)) || 0),
        url: file.url || '', // Provide default
        classId: file.classId
      };

      console.log('Updating file with data:', updateData); // Debug log

      const res = await updateFile(file.id, updateData);

      if (res.success) {
        onUpdate();
        onClose();
      } else {
        setError(res.error || 'Failed to update file');
      }
    } catch (error: any) {
      console.error('Error updating file:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit File</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileName">File Name</Label>
            <Input 
              id="fileName"
              placeholder="File Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity">Activity Type</Label>
            <select 
              id="activity"
              className="border border-gray-300 p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={activity} 
              onChange={(e) => setActivity(e.target.value)}
              disabled={isUpdating}
            >
              {fileActivityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Display file info (read-only) */}
          <div className="space-y-2">
            <Label>File Information</Label>
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <div><strong>Type:</strong> {file.fileType || 'Unknown'}</div>
              <div><strong>Size:</strong> {typeof file.size === 'number' ? 
                (file.size < 1024 * 1024 ? 
                  `${(file.size / 1024).toFixed(1)} KB` : 
                  `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                ) : 'Unknown'
              }</div>
              {file.url && <div><strong>URL:</strong> <span className="break-all">{file.url}</span></div>}
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit} 
              disabled={isUpdating || !name.trim()}
              className="min-w-[80px]"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating
                </>
              ) : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}