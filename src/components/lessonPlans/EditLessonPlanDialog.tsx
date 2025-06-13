'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { updateLessonPlan, updateGenericLessonPlan } from '@/src/app/actions/lessonPlansActions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface EditLessonPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lessonPlan: {
    id: string;
    name: string;
    description?: string;
    genericLessonPlanId?: string;
  };
}

export default function EditLessonPlanDialog({
  isOpen,
  onClose,
  onSuccess,
  lessonPlan,
}: EditLessonPlanDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [form, setForm] = useState({
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isTemplate = !!lessonPlan.genericLessonPlanId;
  const isSuperUser = session?.user?.role === 'SUPER';

  // Set form data when dialog opens or lesson plan changes
  useEffect(() => {
    if (isOpen && lessonPlan) {
      setForm({
        name: lessonPlan.name,
        description: lessonPlan.description || '',
      });
    }
  }, [isOpen, lessonPlan]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      let response;
      
      // If super user is editing a template, use updateGenericLessonPlan
      if (isSuperUser && isTemplate) {
        response = await updateGenericLessonPlan(lessonPlan.id, {
          name: form.name,
          description: form.description,
        });
      } else {
        // Otherwise use regular updateLessonPlan
        response = await updateLessonPlan(lessonPlan.id, {
          name: form.name,
          description: form.description,
        });
      }
      
      if (response.success) {
        toast.success('Lesson plan updated successfully');
        onSuccess(); // Trigger refresh in parent component
        onClose(); // Close the dialog
      } else {
        setError(response.error || 'Failed to update lesson plan');
        toast.error(response.error || 'Failed to update lesson plan');
      }
    } catch (error: any) {
      console.error('Edit lesson plan error:', error);
      setError('An unexpected error occurred');
      toast.error('An error occurred while updating the lesson plan');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isTemplate ? 'Edit Template' : 'Edit Lesson Plan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Lesson Plan Name"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Lesson Plan Description"
              rows={5}
              disabled={isSubmitting}
            />
          </div>
          
          {error && <p className="text-red-600 text-sm">{error}</p>}
          
          <div className="flex justify-end space-x-2">
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
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}