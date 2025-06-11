'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Checkbox } from '@/src/components/ui/checkbox';
import { 
  getAvailableLessonPlansForClass, 
  addLessonPlanToClass,
  getGenericLessonPlans,
  copyTemplateToLessonPlan,
} from '@/src/app/actions/lessonPlansActions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { ScrollArea } from '@/src/components/ui/scroll-area';

interface LessonPlanItem {
  id: string;
  name: string;
  description?: string;
  fileCount?: number;
  assignmentCount?: number;
  gradeLevel?: string;
}

interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  gradeLevel?: string;
  files: any[];
  assignments: any[];
}

interface AddLessonPlanToClassDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classCode: string;
  className: string;
  initialSelectedTemplate?: string;
  onSuccess: () => void;
}

export default function AddLessonPlanToClassDialog({
  isOpen,
  onClose,
  classCode,
  className,
  initialSelectedTemplate,
  onSuccess
}: AddLessonPlanToClassDialogProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'templates'>('existing');
  const [availablePlans, setAvailablePlans] = useState<LessonPlanItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlanIds([]);
      setSelectedTemplateIds([]);
      fetchAvailablePlans();
      fetchTemplates();
    }
  }, [isOpen, classCode]);

  useEffect(() => {
    if (initialSelectedTemplate) {
      setActiveTab('templates');
      setSelectedTemplateIds([initialSelectedTemplate]);
    }
  }, [initialSelectedTemplate]);

  const fetchAvailablePlans = async () => {
    setIsLoading(true);
    try {
      const response = await getAvailableLessonPlansForClass(classCode);
      if (response.success) {
        setAvailablePlans(response.data || []);
      } else {
        toast.error(response.error || 'Failed to fetch available lesson plans');
      }
    } catch (error) {
      console.error('Error fetching available lesson plans:', error);
      toast.error('An error occurred while fetching available lesson plans');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await getGenericLessonPlans('all'); // Get all templates
      if (response.success) {
        setTemplates(response.data || []);
      } else {
        toast.error(response.error || 'Failed to fetch templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('An error occurred while fetching templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanToggle = (planId: string) => {
    setSelectedPlanIds(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplateIds(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleAddSelected = async () => {
    if (activeTab === 'existing') {
      if (selectedPlanIds.length === 0) {
        toast.error('Please select at least one lesson plan');
        return;
      }

      setIsSubmitting(true);
      try {
        const results = await Promise.allSettled(
          selectedPlanIds.map(planId =>
            addLessonPlanToClass({ lessonPlanId: planId, classCode })
          )
        );

        const successful = results.filter(result => 
          result.status === 'fulfilled' && result.value.success
        ).length;

        const failed = results.length - successful;

        if (successful > 0) {
          toast.success(`${successful} lesson plan${successful > 1 ? 's' : ''} added to class successfully`);
          await onSuccess();
          onClose();
        }

        if (failed > 0) {
          toast.error(`Failed to add ${failed} lesson plan${failed > 1 ? 's' : ''}`);
        }
      } catch (error) {
        console.error('Error adding lesson plans to class:', error);
        toast.error('An error occurred while adding lesson plans to class');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Templates tab
      if (selectedTemplateIds.length === 0) {
        toast.error('Please select at least one template');
        return;
      }

      setIsSubmitting(true);
      try {
        const results = await Promise.allSettled(
          selectedTemplateIds.map(async templateId => {
            const template = templates.find(t => t.id === templateId);
            const copyResponse = await copyTemplateToLessonPlan(templateId, {
              name: template?.name
            });

            if (!copyResponse.success) {
              throw new Error(copyResponse.error || 'Failed to create lesson plan from template');
            }

            const addResponse = await addLessonPlanToClass({
              lessonPlanId: copyResponse.data.id,
              classCode
            });

            if (!addResponse.success) {
              throw new Error(addResponse.error || 'Failed to add lesson plan to class');
            }

            return { templateId, lessonPlanId: copyResponse.data.id };
          })
        );

        const successful = results.filter(result => 
          result.status === 'fulfilled'
        ).length;

        const failed = results.length - successful;

        if (successful > 0) {
          toast.success(`${successful} template${successful > 1 ? 's' : ''} copied and added to class successfully`);
          await onSuccess();
          onClose();
        }

        if (failed > 0) {
          toast.error(`Failed to add ${failed} template${failed > 1 ? 's' : ''}`);
        }
      } catch (error) {
        console.error('Error adding templates to class:', error);
        toast.error('An error occurred while adding templates to class');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Add Lesson Plan to {className}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'existing' | 'templates')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-orange-50 mb-4">
            <TabsTrigger 
              value="existing" 
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-sm"
            >
              My Lesson Plans
            </TabsTrigger>
            <TabsTrigger 
              value="templates" 
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-sm"
            >
              Lesson Templates
            </TabsTrigger>
          </TabsList>

          {/* My Lesson Plans Tab */}
          <TabsContent value="existing" className="mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : availablePlans.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="font-medium mb-1">No Available Lesson Plans</p>
                <p className="text-sm">Create new lesson plans from the dashboard first</p>
              </div>
            ) : (
              <ScrollArea className="h-64 pr-4">
                <div className="space-y-3">
                  {availablePlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        selectedPlanIds.includes(plan.id) 
                          ? 'border-orange-500 bg-orange-50 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => handlePlanToggle(plan.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedPlanIds.includes(plan.id)}
                          onChange={() => handlePlanToggle(plan.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium mb-1 truncate">{plan.name}</h3>
                          {plan.gradeLevel && (
                            <Badge variant="outline" className="text-xs mb-2 bg-white">
                              Grade {plan.gradeLevel}
                            </Badge>
                          )}
                          {/* {plan.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {plan.description.replace(/<[^>]*>/g, '').substring(0, 80)}
                              {plan.description.length > 80 ? '...' : ''}
                            </p>
                          )} */}
                          {/* <div className="text-xs text-gray-500 flex gap-4">
                            <span>{plan.fileCount || 0} files</span>
                            <span>{plan.assignmentCount || 0} assignments</span>
                          </div> */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Templates Tab - No grade filter tabs, show all templates */}
          <TabsContent value="templates" className="mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="font-medium mb-1">No Available Templates</p>
                <p className="text-sm">No templates are available</p>
              </div>
            ) : (
              <ScrollArea className="h-64 pr-4">
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        selectedTemplateIds.includes(template.id) 
                          ? 'border-orange-500 bg-orange-50 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => handleTemplateToggle(template.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedTemplateIds.includes(template.id)}
                          onChange={() => handleTemplateToggle(template.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium mb-1 truncate">{template.name}</h3>
                          {template.gradeLevel && template.gradeLevel !== 'all' && (
                            <Badge variant="outline" className="text-xs mb-2 bg-white">
                              Grade {template.gradeLevel}
                            </Badge>
                          )}
                          {/* {template.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {template.description.replace(/<[^>]*>/g, '').substring(0, 80)}
                              {template.description.length > 80 ? '...' : ''}
                            </p>
                          )} */}
                          {/* <div className="text-xs text-gray-500 flex gap-4">
                            <span>{template.files?.length || 0} files</span>
                            <span>{template.assignments?.length || 0} assignments</span>
                          </div> */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddSelected}
            disabled={
              isSubmitting || 
              (activeTab === 'existing' && selectedPlanIds.length === 0) ||
              (activeTab === 'templates' && selectedTemplateIds.length === 0)
            }
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              `Add Selected`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}