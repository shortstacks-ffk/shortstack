'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { updateGenericLessonPlan } from '@/src/app/actions/lessonPlansActions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { GradeLevel } from '@/src/app/actions/lessonPlansActions';

interface EditTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template: {
    id: string;
    name: string;
    description?: string;
    gradeLevel?: string;
  };
}

export default function EditTemplateDialog({
  isOpen,
  onClose,
  onSuccess,
  template,
}: EditTemplateDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    description: '',
    gradeLevel: 'all' as GradeLevel,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Set form data when dialog opens or template changes
  useEffect(() => {
    if (isOpen && template) {
      setForm({
        name: template.name || '',
        description: template.description || '',
        gradeLevel: (template.gradeLevel as GradeLevel) || 'all',
      });
    }
  }, [isOpen, template]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await updateGenericLessonPlan(template.id, {
        name: form.name,
        description: form.description,
        gradeLevel: form.gradeLevel !== 'all' ? form.gradeLevel : undefined,
      });
      
      if (response.success) {
        toast.success('Template updated successfully');
        onSuccess(); // Trigger refresh in parent component
        onClose(); // Close the dialog
      } else {
        setError(response.error || 'Failed to update template');
        toast.error(response.error || 'Failed to update template');
      }
    } catch (error: any) {
      console.error('Edit template error:', error);
      setError('An unexpected error occurred');
      toast.error('An error occurred while updating the template');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Template Name"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="gradeLevel" className="text-sm font-medium">Grade Level</label>
            <Select
              value={form.gradeLevel}
              onValueChange={(value) => setForm({ ...form, gradeLevel: value as GradeLevel })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select grade level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="5-6">Grades 5-6</SelectItem>
                <SelectItem value="7-8">Grades 7-8</SelectItem>
                <SelectItem value="9-10">Grades 9-10</SelectItem>
                <SelectItem value="11-12">Grades 11-12</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Template Description"
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