'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Label } from '@/src/components/ui/label';
import { Input } from '@/src/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/src/components/ui/select";
import { 
  updateFileVisibility, 
  updateAssignmentVisibility, 
  ensureVisibilityRecords
} from '@/src/app/actions/contentVisibilityActions';
import { toast } from 'sonner';
import { Loader2, Calendar, Bell, BellOff, Clock, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { TimePicker } from '../ui/time-picker';
import AssignToClassPrompt from './AssignToClassPrompt';

interface Class {
  id: string;
  name: string;
  code: string;
}

interface ContentVisibilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'file' | 'assignment';
  contentId: string;
  contentName: string;
  classes: Class[];
  lessonPlanId: string;
  onSuccess?: () => void;
}

export default function ContentVisibilityDialog({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentName,
  classes: initialClasses,
  lessonPlanId,
  onSuccess
}: ContentVisibilityDialogProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [makeVisible, setMakeVisible] = useState(false);
  const [useVisibilityDate, setUseVisibilityDate] = useState(false);
  const [visibilityDate, setVisibilityDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [visibilityTime, setVisibilityTime] = useState<string>("00:00"); // Add separate time state
  const [useDueDate, setUseDueDate] = useState(contentType === 'assignment');
  const [dueDate, setDueDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [dueTime, setDueTime] = useState<string>("20:00"); // Default to 8:00 PM
  const [sendNotifications, setSendNotifications] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAssignPrompt, setShowAssignPrompt] = useState(false);
  const [justAssignedClasses, setJustAssignedClasses] = useState<Class[]>([]);
  
  // Initialize local classes state from prop when dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log('ContentVisibilityDialog opened, classes:', initialClasses);
      
      // IMPORTANT: We only want to set these values ONCE when dialog opens
      // Not on every render or whenever initialClasses changes reference
      const classesToUse = initialClasses || [];
      console.log('Setting classes to:', classesToUse);
      
      // Set classes and selected classes
      setClasses(classesToUse);
      setSelectedClasses(classesToUse.map(c => c.id));
      
      // Default values
      setMakeVisible(false);
      setUseVisibilityDate(false);
      setVisibilityDate(format(new Date(), 'yyyy-MM-dd'));
      setVisibilityTime("00:00");
      setDueDate(format(new Date(), 'yyyy-MM-dd'));
      setDueTime("20:00");
      setSendNotifications(true);
      
      // Reset justAssignedClasses since we're opening a fresh dialog
      setJustAssignedClasses([]);
      
      // Then fetch current settings - which will override defaults
      // Note: we call this outside the useEffect to avoid dependency issues
    }
  }, [isOpen]);

  // Now add a separate effect that runs when classes are set or changed
  useEffect(() => {
    if (isOpen && (classes.length > 0 || justAssignedClasses.length > 0)) {
      console.log('Classes or justAssignedClasses changed, fetching current settings');
      fetchCurrentSettings();
    }
  }, [isOpen, classes, justAssignedClasses]);

  // Simplify fetchCurrentSettings to avoid unnecessary API calls
  const fetchCurrentSettings = useCallback(async () => {
    console.log('fetchCurrentSettings called');
    
    if (!isOpen || !contentId) {
      console.log('Dialog not open or no contentId, skipping fetchCurrentSettings');
      return;
    }
    
    setIsLoading(true);
    try {
      // If there are no classes yet, don't bother fetching settings
      if (classes.length === 0 && !justAssignedClasses.length) {
        console.log('No classes to fetch visibility for');
        setIsLoading(false);
        return;
      }
      
      // Get all class IDs including any just assigned
      const allClasses = [...classes, ...justAssignedClasses];
      const classIds = Array.from(new Set(allClasses.map(c => c.id)));
      console.log('Fetching visibility for classes:', classIds);
      
      // Skip fetching visibility records if there are no classes
      if (classIds.length === 0) {
        console.log('No classIds available, skipping fetch');
        setMakeVisible(false);
        setIsLoading(false);
        return;
      }
      
      try {
        console.log(`Fetching visibility settings for ${contentType} with ID ${contentId} for classes: ${classIds.join(',')}`);
        
        const url = `/api/teacher/content-visibility?${
          contentType === 'file' ? `fileId=${contentId}` : `assignmentId=${contentId}`
        }&classIds=${classIds.join(',')}`;
        
        console.log('Fetching from URL:', url);
        
        // Only get current visibility settings
        const response = await fetch(url);
        
        console.log('Fetch response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch visibility settings (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Raw visibility data:', data);
        
        if (data.success && data.data && data.data.length > 0) {
          console.log('Visibility settings fetched:', data.data);
          
          // Check if ANY of the classes have visibility enabled
          const anyVisible = data.data.some((setting: any) => setting.visibleToStudents === true);
          console.log('Any visible setting found:', anyVisible);
          setMakeVisible(anyVisible);
          
          // Find the first setting with visibility info for more details
          const visibilitySettings = data.data.filter((setting: any) => setting.visibleToStudents === true);
          
          if (visibilitySettings.length > 0) {
            const firstVisibleSetting = visibilitySettings[0];
            console.log('Using visibility settings from:', firstVisibleSetting);
            
            if (firstVisibleSetting.visibilityStartDate) {
              setUseVisibilityDate(true);
              const visDateTime = new Date(firstVisibleSetting.visibilityStartDate);
              setVisibilityDate(format(visDateTime, 'yyyy-MM-dd'));
              
              const hours = visDateTime.getHours().toString().padStart(2, '0');
              const minutes = visDateTime.getMinutes().toString().padStart(2, '0');
              setVisibilityTime(`${hours}:${minutes}`);
            }
            
            if (contentType === 'assignment' && firstVisibleSetting.dueDate) {
              setUseDueDate(true);
              const dueDateTime = new Date(firstVisibleSetting.dueDate);
              
              setDueDate(format(dueDateTime, 'yyyy-MM-dd'));
              
              const hours = dueDateTime.getHours().toString().padStart(2, '0');
              const minutes = dueDateTime.getMinutes().toString().padStart(2, '0');
              setDueTime(`${hours}:${minutes}`);
            }
          }
        } else {
          console.log('No visibility settings found or data is empty');
          setMakeVisible(false);
        }
      } catch (error) {
        console.error('Error fetching visibility settings:', error);
        // Continue anyway with default settings
      }
    } catch (error) {
      console.error('Error in fetchCurrentSettings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contentId, contentType, isOpen, classes, justAssignedClasses]); // Only depend on these values, not classes or justAssignedClasses

  // Check if we need to show the class assignment prompt
  useEffect(() => {
    // Only show the assignment prompt if:
    // 1. The dialog is open AND
    // 2. There are NO classes assigned to the lesson plan AND
    // 3. The user is trying to make content visible
    const hasNoClasses = !classes || classes.length === 0;
    setShowAssignPrompt(isOpen && hasNoClasses && makeVisible);
    
    // Debug log
    if (isOpen && makeVisible) {
      console.log('Classes available:', classes.length, 'Show prompt:', hasNoClasses);
    }
  }, [isOpen, classes, makeVisible]);

  const toggleClass = (classId: string) => {
    setSelectedClasses(prev => 
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const toggleAllClasses = () => {
    if (selectedClasses.length === classes.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(classes.map(c => c.id));
    }
  };

  const handleSubmit = async () => {
    // Only show assignment prompt when trying to make visible with no classes
    if (selectedClasses.length === 0) {
      if (makeVisible && classes.length === 0) {
        setShowAssignPrompt(true);
        return;
      }
      toast.error('Please select at least one class');
      return;
    }

    setIsSubmitting(true);

    try {
      if (contentType === 'file') {
        let visibilityDateObj = null;
        if (useVisibilityDate && visibilityDate) {
          // Combine date and time
          const [year, month, day] = visibilityDate.split('-').map(Number);
          const [hours, minutes] = visibilityTime.split(':').map(Number);
          visibilityDateObj = new Date(year, month - 1, day, hours, minutes);
        }

        const result = await updateFileVisibility({
          fileId: contentId,
          classIds: selectedClasses,
          visibleToStudents: makeVisible,
          visibilityStartDate: visibilityDateObj
        });

        if (result.success) {
          toast.success(`File visibility updated for ${selectedClasses.length} class(es)`);
          // Make sure onSuccess is called to refresh the UI
          if (onSuccess) {
            await onSuccess(); // Add await here to ensure it completes
          }
          onClose();
        } else {
          throw new Error(result.error || 'Failed to update file visibility');
        }
      } else { // assignment
        // For assignments, combine the date and time
        let combinedDueDateTime: Date | null = null;
        
        if (useDueDate && dueDate) {
          // Parse the time string (format: HH:MM)
          const [hours, minutes] = dueTime.split(':').map(Number);
          const [year, month, day] = dueDate.split('-').map(Number);
          
          // Create a new date object with the selected date and time
          combinedDueDateTime = new Date(year, month - 1, day, hours, minutes);
        }

        let visibilityDateObj = null;
        if (useVisibilityDate && visibilityDate) {
          // Combine visibility date and time
          const [year, month, day] = visibilityDate.split('-').map(Number);
          const [hours, minutes] = visibilityTime.split(':').map(Number);
          visibilityDateObj = new Date(year, month - 1, day, hours, minutes);
        }

        const result = await updateAssignmentVisibility({
          assignmentId: contentId,
          classIds: selectedClasses,
          visibleToStudents: makeVisible,
          visibilityStartDate: visibilityDateObj,
          dueDate: combinedDueDateTime,
          sendNotifications: sendNotifications
        });

        if (result.success) {
          toast.success(`Assignment visibility updated for ${selectedClasses.length} class(es)`);
          // Make sure onSuccess is called to refresh the UI
          if (onSuccess) {
            await onSuccess(); // Add await here to ensure it completes
          }
          onClose();
        } else {
          throw new Error(result.error || 'Failed to update assignment visibility');
        }
      }
    } catch (error: any) {
      console.error('Error updating content visibility:', error);
      toast.error(error.message || 'Failed to update visibility settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for class assignment completion
  const handleClassAssignment = (assignedClasses: Class[]) => {
    setShowAssignPrompt(false);
    setSelectedClasses(assignedClasses.map(c => c.id));
    setJustAssignedClasses(assignedClasses);
    setClasses(prev => [...prev, ...assignedClasses]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {contentType === 'file' ? (
              <>
                {makeVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Manage File Visibility
              </>
            ) : (
              <>
                {makeVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Manage Assignment
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="py-2 space-y-4">
            {/* Content Name */}
            <div>
              <h3 className="font-medium text-sm">{contentName}</h3>
            </div>
            
            {/* Classes Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Classes</Label>
                {classes.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleAllClasses}
                    className="h-6 text-xs"
                  >
                    {selectedClasses.length === classes.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
              
              {classes.length === 0 ? (
                <p className="text-xs text-center py-2 text-gray-500">
                  No classes available. This {contentType} hasn't been assigned to any class yet.
                </p>
              ) : classes.length <= 3 ? (
                <div className="space-y-2 pl-1">
                  {classes.map(cls => (
                    <div key={cls.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`class-${cls.id}`}
                        checked={selectedClasses.includes(cls.id)}
                        onCheckedChange={() => toggleClass(cls.id)}
                      />
                      <Label 
                        htmlFor={`class-${cls.id}`}
                        className="cursor-pointer text-sm"
                      >
                        {cls.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <Select 
                  value={selectedClasses.length === 0 
                    ? "none" 
                    : selectedClasses.length === classes.length 
                      ? "all" 
                      : "some"
                  }
                  onValueChange={(value) => {
                    if (value === "all") setSelectedClasses(classes.map(c => c.id));
                    if (value === "none") setSelectedClasses([]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes ({classes.length})</SelectItem>
                    <SelectItem value="some">{selectedClasses.length} Classes Selected</SelectItem>
                    <SelectItem value="none">No Classes</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Visibility Toggle */}
            <div className="space-y-3 border p-3 rounded-md">
              <h4 className="text-sm font-medium mb-2">Visibility Status:</h4>
              <div className="space-y-2 pl-1">
                {/* Hidden Option */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <EyeOff className="h-4 w-4 text-gray-600" />
                    <Label htmlFor="hidden" className="cursor-pointer text-sm">
                      Hidden from students
                    </Label>
                  </div>
                  <Checkbox 
                    id="hidden"
                    checked={!makeVisible}
                    onCheckedChange={(checked) => setMakeVisible(!checked)}
                  />
                </div>
                
                {/* Visible Option */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-green-600" />
                    <Label htmlFor="visible" className="cursor-pointer text-sm">
                      Visible to students
                    </Label>
                  </div>
                  <Checkbox 
                    id="visible"
                    checked={makeVisible}
                    onCheckedChange={(checked) => setMakeVisible(!!checked)}
                  />
                </div>
              </div>
            </div>

            {/* Visibility Options */}
            {makeVisible && (
              <div className="space-y-3 border-l-2 pl-3 ml-1 border-gray-200">
                {/* Due Date & Time (for assignments) - MOVED TO TOP */}
                {contentType === 'assignment' && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <Label className="cursor-pointer text-sm font-medium">
                        Assignment due date and time:
                      </Label>
                    </div>
                    <div className="pl-6">
                      <div className="flex gap-2">
                        <Input 
                          id="dueDate"
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="h-8 text-sm"
                        />
                        <TimePicker
                          value={new Date(`2000-01-01T${dueTime}:00`)}
                          onChange={(time) => {
                            // Extract hours and minutes from the selected time and format as HH:MM
                            const hours = time.getHours().toString().padStart(2, '0');
                            const minutes = time.getMinutes().toString().padStart(2, '0');
                            setDueTime(`${hours}:${minutes}`);
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Schedule Visibility Date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <Label htmlFor="scheduleVisibility" className="cursor-pointer text-sm">
                      Schedule visibility for later
                    </Label>
                  </div>
                  <Checkbox 
                    id="scheduleVisibility"
                    checked={useVisibilityDate}
                    onCheckedChange={(checked) => setUseVisibilityDate(!!checked)}
                  />
                </div>

                {useVisibilityDate && (
                  <div className="pl-6">
                    <Label htmlFor="visibilityDate" className="text-xs text-gray-500 mb-1 block">
                      Available from:
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        id="visibilityDate"
                        type="date"
                        value={visibilityDate}
                        onChange={(e) => setVisibilityDate(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <TimePicker
                        value={new Date(`2000-01-01T${visibilityTime}:00`)} 
                        onChange={(time) => {
                          const hours = time.getHours().toString().padStart(2, '0');
                          const minutes = time.getMinutes().toString().padStart(2, '0');
                          setVisibilityTime(`${hours}:${minutes}`);
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Comment out the notification option */}
                {/* 
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    {sendNotifications ? (
                      <Bell className="h-4 w-4 text-gray-600" />
                    ) : (
                      <BellOff className="h-4 w-4 text-gray-600" />
                    )}
                    <Label htmlFor="sendNotifications" className="cursor-pointer text-sm">
                      Send email notifications
                    </Label>
                  </div>
                  <Checkbox 
                    id="sendNotifications"
                    checked={sendNotifications}
                    onCheckedChange={(checked) => setSendNotifications(!!checked)}
                  />
                </div>
                */}
              </div>
            )}


            {/* No Classes Message with Assign Button - Only show when trying to make visible */}
            {(classes.length === 0 && makeVisible && !showAssignPrompt) && (
              <div className="text-sm text-center py-4 text-amber-600 bg-amber-50 rounded border border-amber-200 my-2">
                <p>This {contentType} hasn't been assigned to any classes yet.</p>
                <p className="text-xs mt-1">
                  Before making it visible to students, you need to assign its lesson plan to at least one class.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  onClick={() => setShowAssignPrompt(true)}
                >
                  Assign to Classes
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || selectedClasses.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>

            {/* Class Assignment Prompt */}
            {showAssignPrompt && (
              <AssignToClassPrompt
                isOpen={showAssignPrompt}
                onClose={() => setShowAssignPrompt(false)}
                lessonPlanId={lessonPlanId}
                contentName={contentName}
                contentType={contentType}
                contentId={contentId}
                onAssigned={handleClassAssignment}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}