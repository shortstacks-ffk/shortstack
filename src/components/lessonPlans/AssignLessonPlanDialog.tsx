'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Label } from '@/src/components/ui/label';
import { Checkbox } from '@/src/components/ui/checkbox';
import { addLessonPlanToClass } from '@/src/app/actions/lessonPlansActions';
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

interface AssignLessonPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lessonPlanId: string;
  lessonPlanName: string;
  onSuccess?: () => void;
}

export default function AssignLessonPlanDialog({
  isOpen,
  onClose,
  lessonPlanId,
  lessonPlanName,
  onSuccess
}: AssignLessonPlanDialogProps) {
  const router = useRouter();
  const [selectedClassCodes, setSelectedClassCodes] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedClassCodes([]);
      fetchClasses();
    }
  }, [isOpen, lessonPlanId]);

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      // Fetch all teacher's classes
      const allClassesResponse = await fetch('/api/classes');
      if (!allClassesResponse.ok) {
        throw new Error('Failed to fetch classes');
      }
      const allClassesData = await allClassesResponse.json();
      setAllClasses(allClassesData.classes || []);

      // Fetch classes that already have this lesson plan
      const assignedResponse = await fetch(`/api/classes/available-for-lesson/${lessonPlanId}`);
      if (assignedResponse.ok) {
        const assignedData = await assignedResponse.json();
        // The available classes API returns classes that DON'T have the lesson plan
        // So we need to determine assigned classes by comparing
        const assignedClassIds = (allClassesData.classes || [])
          .filter((cls: ClassItem) => !assignedData.some((available: ClassItem) => available.id === cls.id))
          .map((cls: ClassItem) => cls.id);
        
        setAssignedClasses(
          (allClassesData.classes || []).filter((cls: ClassItem) => assignedClassIds.includes(cls.id))
        );
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setIsLoading(false);
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
        selectedClassCodes.map(classCode =>
          addLessonPlanToClass({
            lessonPlanId,
            classCode
          })
        )
      );

      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;

      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(`Lesson plan assigned to ${successful} class${successful > 1 ? 'es' : ''} successfully`);
        router.refresh();
        if (onSuccess) onSuccess();
        onClose();
      }

      if (failed > 0) {
        toast.error(`Failed to assign to ${failed} class${failed > 1 ? 'es' : ''}`);
      }
    } catch (error) {
      console.error('Error assigning lesson plan to classes:', error);
      toast.error('Failed to assign lesson plan to classes');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get assigned class IDs for filtering
  const assignedClassIds = assignedClasses.map(cls => cls.id);
  
  // Filter out already assigned classes
  const availableClasses = allClasses.filter(
    cls => !assignedClassIds.includes(cls.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Lesson Plan to Classes</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            Select classes to assign "{lessonPlanName}" to:
          </p>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            </div>
          ) : availableClasses.length > 0 ? (
            <div className="max-h-60 overflow-y-auto border rounded p-2">
              {availableClasses.map(cls => (
                <div
                  key={cls.id}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer mb-1 ${
                    selectedClassCodes.includes(cls.code) ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                >
                  <Checkbox
                    id={`class-${cls.id}`}
                    checked={selectedClassCodes.includes(cls.code)}
                    onCheckedChange={() => handleToggleClass(cls.code)}
                  />
                  <Label
                    htmlFor={`class-${cls.id}`}
                    className="flex items-center cursor-pointer flex-1"
                    onClick={() => handleToggleClass(cls.code)}
                  >
                    <span className="text-xl mr-2">{cls.emoji}</span>
                    <span>{cls.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {cls.studentCount} students
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-500">
              No more classes available. This lesson plan is already assigned to all your classes.
            </p>
          )}

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
              disabled={isSubmitting || selectedClassCodes.length === 0 || availableClasses.length === 0}
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