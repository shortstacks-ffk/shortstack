'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { GradeLevel } from '@/src/app/actions/lessonPlansActions';
import { Loader2 } from 'lucide-react';

interface GenericLessonPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; gradeLevel?: string }) => Promise<void> | void;
  initialData?: {
    name: string;
    description?: string;
    gradeLevel?: string;
  };
  showGradeSelect?: boolean;
}

export default function GenericLessonPlanDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  showGradeSelect = false,
}: GenericLessonPlanDialogProps) {
  const [form, setForm] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    gradeLevel: initialData?.gradeLevel || 'all',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens with new data
  useState(() => {
    if (isOpen && initialData) {
      setForm({
        name: initialData.name || '',
        description: initialData.description || '',
        gradeLevel: initialData.gradeLevel || 'all',
      });
    }
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (!form.name.trim()) {
        setError('Name is required');
        return;
      }
      
      await onSubmit({
        name: form.name,
        description: form.description,
        gradeLevel: form.gradeLevel !== 'all' ? form.gradeLevel : undefined,
      });
      
      setForm({ name: '', description: '', gradeLevel: 'all' });
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Template' : 'Create Lesson Plan Template'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Template Name"
              required
              disabled={isSubmitting}
            />
          </div>
          
          {showGradeSelect && (
            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Select
                value={form.gradeLevel}
                onValueChange={(value) => setForm({ ...form, gradeLevel: value })}
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
          )}
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Template Description"
              rows={5}
              disabled={isSubmitting}
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
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
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {initialData ? 'Updating...' : 'Creating...'}
                </>
              ) : initialData ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}