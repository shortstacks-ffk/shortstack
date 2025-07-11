'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Label } from '@/src/components/ui/label';
import { Checkbox } from '@/src/components/ui/checkbox';
import { copyTemplateToLessonPlan, addLessonPlanToClass, getLessonPlanByID } from '@/src/app/actions/lessonPlansActions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ClassItem {
  id: string;
  name: string;
  code: string;
  emoji: string;
  studentCount?: number;
}

interface AssignToClassDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  onSuccess?: () => void;
}

export default function AssignToClassDialog({
  isOpen,
  onClose,
  templateId,
  onSuccess
}: AssignToClassDialogProps) {
  const router = useRouter();
  const [selectedClassCodes, setSelectedClassCodes] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedClassCodes([]);
      fetchClasses();
      fetchTemplateName();
    }
  }, [isOpen, templateId]);

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/classes');
      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }
      const data = await response.json();
      setAllClasses(data.classes || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplateName = async () => {
    try {
      const response = await getLessonPlanByID(templateId);
      if (response.success && response.data) {
        setTemplateName(response.data.name);
      }
    } catch (error) {
      console.error('Error fetching template details:', error);
    }
  };

  const handleToggleClass = (classCode: string) => {
    setSelectedClassCodes(prev =>
      prev.includes(classCode)
        ? prev.filter(code => code !== classCode)
        : [...prev, classCode]
    );
  };

  const handleSubmit = async () => {
    if (selectedClassCodes.length === 0) {
      toast.error('Please select at least one class');
      return;
    }

    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(
        selectedClassCodes.map(async classCode => {
          // First copy template to create a new lesson plan
          const copyResponse = await copyTemplateToLessonPlan(templateId, {
            name: templateName
          });

          if (!copyResponse.success) {
            throw new Error(copyResponse.error || 'Failed to create lesson plan from template');
          }

          // Then add the new lesson plan to the selected class
          const addResponse = await addLessonPlanToClass({
            lessonPlanId: copyResponse.data.id,
            classCode
          });

          if (!addResponse.success) {
            throw new Error(addResponse.error || 'Failed to assign to class');
          }

          return { lessonPlanId: copyResponse.data.id, classCode };
        })
      );

      const successful = results.filter(result => 
        result.status === 'fulfilled'
      ).length;

      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(`Template assigned to ${successful} class${successful > 1 ? 'es' : ''} successfully`);
        router.refresh();
        if (onSuccess) onSuccess();
        onClose();
      }

      if (failed > 0) {
        toast.error(`Failed to assign to ${failed} class${failed > 1 ? 'es' : ''}`);
      }
    } catch (error) {
      console.error('Error assigning template to classes:', error);
      toast.error('Failed to assign template to classes');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Template to Classes</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            Select classes to assign "{templateName}" to:
          </p>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            </div>
          ) : allClasses.length > 0 ? (
            <div className="max-h-60 overflow-y-auto border rounded p-2">
  {allClasses.map(cls => {
    const isSelected = selectedClassCodes.includes(cls.code)
    return (
      <div
        key={cls.id}
        className={`flex items-center gap-2 p-2 rounded cursor-pointer mb-1 ${
          isSelected ? "bg-gray-100" : "hover:bg-gray-50"
        }`}
      >
        <Checkbox
          id={`class-${cls.id}`}
          checked={isSelected}
          onCheckedChange={() => handleToggleClass(cls.code)}
        />
        <Label
          htmlFor={`class-${cls.id}`}
          className="flex items-center cursor-pointer flex-1"
        >
          <span className="text-xl mr-2">{cls.emoji}</span>
          <span>{cls.name}</span>
          <span className="text-xs text-gray-500 ml-auto">
            {cls.studentCount} students
          </span>
        </Label>
      </div>
    )
  })}
</div>

          ) : (
            <p className="text-center py-4 text-gray-500">
              You don't have any classes yet. Create a class first to assign templates.
            </p>
          )}

          <div className="text-sm mt-4 p-3 bg-blue-50 rounded">
            <p className="font-medium mb-2">What happens when you assign:</p>
            <ul className="list-disc pl-5 text-gray-700 space-y-1 text-xs">
              <li>A copy of this template will be created for each selected class</li>
              <li>Each copy will be automatically added to its respective class</li>
              <li>You'll be able to edit each copy independently</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedClassCodes.length === 0 || allClasses.length === 0}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign to Classes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}