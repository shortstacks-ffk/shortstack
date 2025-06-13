'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { createLessonPlan } from '@/src/app/actions/lessonPlansActions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AddLessonPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  classCode?: string;
}

export default function AddLessonPlanDialog({
  isOpen,
  onClose,
  onSuccess,
  classCode = ""
}: AddLessonPlanDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setForm({
      name: '',
      description: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await createLessonPlan({
        name: form.name,
        description: form.description
      });
      
      if (response.success) {
        toast.success('Lesson plan created successfully');
        resetForm();
        
        // Force router refresh like bills
        router.refresh();
        
        // Call onSuccess callback for AddAnything
        if (onSuccess) {
          onSuccess();
        }
        
        // Close the dialog
        onClose();
      } else {
        toast.error(response.error || 'Failed to create lesson plan');
      }
    } catch (error) {
      console.error('Error creating lesson plan:', error);
      toast.error('An error occurred while creating the lesson plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create A New Lesson Plan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Lesson Plan Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter lesson plan name..."
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter lesson plan description..."
              disabled={isSubmitting}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.name.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}