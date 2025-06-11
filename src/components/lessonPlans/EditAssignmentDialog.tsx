'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { updateAssignment } from '@/src/app/actions/assignmentActions';
import { toast } from 'sonner';
import { AssignmentRecord } from '@/src/types/assignments';
import { Loader2 } from 'lucide-react';

interface EditAssignmentDialogProps {
  assignment: AssignmentRecord;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

// File-based assignment activity options
const fileActivityOptions = [
  { label: 'Homework', value: 'Homework' },
  { label: 'Writing Assignment', value: 'Writing Assignment' },
  { label: 'Worksheet', value: 'Worksheet' },
];

// Text-based assignment activity options  
const textActivityOptions = [
  { label: 'Short Answer', value: 'Short Answer' },
  { label: 'Discussion Question', value: 'Discussion Question' },
  { label: 'Reflection', value: 'Reflection' },
  { label: 'Quick Task', value: 'Quick Task' },
  { label: 'Reading Response', value: 'Reading Response' },

];

export default function EditAssignmentDialog({
  assignment,
  isOpen,
  onClose,
  onUpdate
}: EditAssignmentDialogProps) {
  const [form, setForm] = useState({
    name: '',
    activity: '',
    dueDate: '',
    textAssignment: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Determine if this is a text assignment
  const isTextAssignment = assignment.fileType === 'text';
  
  useEffect(() => {
    if (assignment) {
      setForm({
        name: assignment.name,
        activity: assignment.activity || '',
        dueDate: assignment.dueDate ? 
          new Date(assignment.dueDate).toISOString().split('T')[0] : '',
        textAssignment: assignment.textAssignment || ''
      });
    }
  }, [assignment]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await updateAssignment(assignment.id, {
        name: form.name,
        activity: form.activity,
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
        classId: assignment.classId || "",
        textAssignment: isTextAssignment ? form.textAssignment : undefined,
        // Include other required fields from the original assignment
        url: assignment.url,
        fileType: assignment.fileType,
        size: assignment.size
      });
      
      if (result.success) {
        toast.success('Assignment updated successfully');
        onUpdate();
        onClose();
      } else {
        throw new Error(result.error || 'Failed to update assignment');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error updating assignment');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get appropriate activity options based on assignment type
  const activityOptions = isTextAssignment ? textActivityOptions : fileActivityOptions;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit {isTextAssignment ? 'Text Assignment' : 'Assignment'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Assignment Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter assignment name"
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="activity">Activity Type</Label>
            <select
              id="activity"
              className="border border-gray-300 p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={form.activity}
              onChange={(e) => setForm({ ...form, activity: e.target.value })}
              disabled={isSubmitting}
            >
              <option value="">Select activity type</option>
              {activityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Show text assignment field if it's a text assignment */}
          {isTextAssignment && (
            <div className="space-y-2">
              <Label htmlFor="textAssignment">Assignment Text</Label>
              <Textarea
                id="textAssignment"
                value={form.textAssignment}
                onChange={(e) => setForm({ ...form, textAssignment: e.target.value })}
                placeholder="Assignment instructions..."
                disabled={isSubmitting}
                className="min-h-[100px] resize-none"
                maxLength={1000}
              />
              <div className="text-xs text-gray-500 text-right">
                {form.textAssignment.length}/1000 characters
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.name.trim()}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}