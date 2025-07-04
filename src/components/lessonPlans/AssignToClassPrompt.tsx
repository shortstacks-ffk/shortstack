'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Label } from '@/src/components/ui/label';
import { Loader2 } from 'lucide-react';
import { addLessonPlanToClass } from '@/src/app/actions/lessonPlansActions';
import { ensureVisibilityRecords } from '@/src/app/actions/contentVisibilityActions'; // Add this import
import { toast } from 'sonner';

interface Class {
  id: string;
  code: string;
  name: string;
  emoji?: string;
}

interface AssignToClassPromptProps {
  isOpen: boolean;
  onClose: () => void;
  lessonPlanId: string;
  contentName: string;
  contentType: 'file' | 'assignment';
  contentId: string; // Add this prop
  onAssigned: (selectedClasses: Class[]) => void;
}

export default function AssignToClassPrompt({
  isOpen,
  onClose,
  lessonPlanId,
  contentName,
  contentType,
  contentId,
  onAssigned
}: AssignToClassPromptProps) {
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [selectedClassCodes, setSelectedClassCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available classes that the lesson plan is not assigned to yet
  useEffect(() => {
    if (!isOpen) return;
    
    async function fetchClasses() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/teacher/classes');
        if (!response.ok) {
          throw new Error('Failed to fetch classes');
        }
        
        const allClasses = await response.json();
        
        // Also fetch classes already assigned to this lesson plan to filter them out
        const assignedResponse = await fetch(`/api/teacher/lesson-plans/${lessonPlanId}/classes`);
        if (assignedResponse.ok) {
          const assignedClasses = await assignedResponse.json();
          const assignedClassCodes = assignedClasses.map((c: any) => c.code);
          
          // Filter out classes that are already assigned to this lesson plan
          const filtered = allClasses.filter((c: any) => !assignedClassCodes.includes(c.code));
          setAvailableClasses(filtered);
        } else {
          setAvailableClasses(allClasses);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError('Failed to load classes. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchClasses();
  }, [isOpen, lessonPlanId]);

  const handleSubmit = async () => {
    if (selectedClassCodes.length === 0) {
      setError('Please select at least one class');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Step 1: Assign the lesson plan to each selected class
      const assignResults = await Promise.all(
        selectedClassCodes.map(classCode => 
          addLessonPlanToClass({
            lessonPlanId,
            classCode
          })
        )
      );
      
      // Check for failures
      const failures = assignResults.filter(result => !result.success);
      if (failures.length > 0) {
        toast.error(`Failed to assign to ${failures.length} class(es)`);
        setError(`Some assignments failed. Please try again.`);
        return;
      }
      
      // Step 2: Get the full class objects for the selected classes
      const selectedClasses = availableClasses.filter(cls => 
        selectedClassCodes.includes(cls.code)
      );
      
      // Step 3: Create visibility records for each class
      if (contentType && contentId) {
        const classIds = selectedClasses.map(cls => cls.id);
        
        const ensureResult = await ensureVisibilityRecords({
          contentType,
          contentId,
          classIds
        });
        
        if (!ensureResult.success) {
          console.warn('Issue ensuring visibility records:', ensureResult.error);
        } else {
          console.log('Visibility records ensured:', ensureResult.data);
        }
      }
      
      toast.success(`Lesson plan assigned to ${selectedClassCodes.length} class(es)`);
      onAssigned(selectedClasses);
    } catch (err) {
      console.error('Error assigning lesson plan:', err);
      setError('Failed to assign lesson plan to classes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleClass = (classCode: string) => {
    setSelectedClassCodes(prev => 
      prev.includes(classCode) 
        ? prev.filter(code => code !== classCode) 
        : [...prev, classCode]
    );
  };
  
  const toggleAllClasses = () => {
    if (selectedClassCodes.length === availableClasses.length) {
      setSelectedClassCodes([]);
    } else {
      setSelectedClassCodes(availableClasses.map(c => c.code));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Class</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="text-sm">
            <p>The {contentType} <strong>"{contentName}"</strong> is not assigned to any classes yet.</p>
            <p className="mt-2">Select classes to assign this lesson plan to:</p>
          </div>

          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {availableClasses.length === 0 ? (
                <p className="text-center py-4 text-gray-500">
                  No classes available. Please create a class first.
                </p>
              ) : (
                <>
                  {/* Class selection header with select/deselect all */}
                  {availableClasses.length > 1 && (
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={toggleAllClasses}
                        className="h-6 text-xs"
                      >
                        {selectedClassCodes.length === availableClasses.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                  )}
                  
                  {/* List of classes with checkboxes */}
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pl-1">
                    {availableClasses.map(cls => (
                      <div key={cls.code} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`class-${cls.code}`}
                          checked={selectedClassCodes.includes(cls.code)}
                          onCheckedChange={() => toggleClass(cls.code)}
                        />
                        <Label 
                          htmlFor={`class-${cls.code}`}
                          className="cursor-pointer text-sm"
                        >
                          {cls.emoji && <span className="mr-2">{cls.emoji}</span>}
                          {cls.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedClassCodes.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign & Continue'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}