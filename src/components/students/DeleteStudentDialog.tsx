'use client';

import { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';
import { Label } from '@/src/components/ui/label';
import { deleteStudent } from '@/src/app/actions/studentActions';
import { toast } from 'react-hot-toast';

interface DeleteStudentDialogProps {
  studentId: string;
  studentName: string;
  classCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteStudentDialog({
  studentId,
  studentName,
  classCode,
  open,
  onOpenChange,
  onSuccess,
}: DeleteStudentDialogProps) {
  const [deleteOption, setDeleteOption] = useState<'class' | 'all'>('class');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!studentId) return; // Safety check
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await deleteStudent(
        classCode, 
        studentId, 
        { removeFromClassOnly: deleteOption === 'class' }
      );
      
      if (result.success) {
        // Handle warnings but still consider it a success
        if (result.warning) {
          toast.success(result.message);
        } else {
          toast.success(result.message || (deleteOption === 'class' 
            ? `${studentName} removed from class` 
            : `${studentName} deleted from system`)
          );
        }
        
        // Always refresh the list on any kind of success
        onSuccess();
        onOpenChange(false);
      } else {
        // Handle error case
        setError(result.error || 'Failed to delete student');
        toast.error(result.error || 'Failed to delete student');
      }
    } catch (error: any) {
      console.error('Delete student error:', error);
      const errorMessage = error.message || 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isLoading) {
          setError(null);
          onOpenChange(isOpen);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Student</AlertDialogTitle>
          <AlertDialogDescription>
            How would you like to remove {studentName}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid gap-4 py-4">
          <RadioGroup 
            defaultValue="class" 
            value={deleteOption}
            onValueChange={(value) => setDeleteOption(value as 'class' | 'all')}
          >
            <div className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value="class" id="class" />
              <Label htmlFor="class">Remove from this class only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all">Delete student from all classes</Label>
            </div>
          </RadioGroup>
          
          {deleteOption === 'all' && (
            <div className="text-destructive text-sm mt-2">
              Warning: This will permanently delete the student's data from all classes.
            </div>
          )}
          
          {error && (
            <div className="text-destructive text-sm mt-2 p-2 bg-destructive/10 rounded-md">
              Error: {error}
            </div>
          )}
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault(); // Prevent default to handle the action manually
              handleDelete();
            }} 
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}