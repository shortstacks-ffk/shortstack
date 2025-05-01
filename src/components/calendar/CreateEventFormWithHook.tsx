import React, { useState, useEffect } from 'react';
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { useModal } from "@/src/providers/scheduler/modal-context";
import { useScheduler } from "@/src/providers/scheduler/schedular-provider";
import { format } from 'date-fns';
import { v4 as uuidv4 } from "uuid";
import { Checkbox } from "@/src/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";

// This component will be used as the CustomForm for the CustomAddEventModal
export function CreateEventFormWithHook({ register, errors }) {
  const { data, setClose } = useModal();
  const { handlers } = useScheduler();
  
  // Get default dates from modal data or use current date
  const defaultStartDate = data?.default?.startDate || new Date();
  const defaultEndDate = data?.default?.endDate || new Date(defaultStartDate.getTime() + 60 * 60 * 1000);
  
  const [title, setTitle] = useState(data?.default?.title || '');
  const [description, setDescription] = useState(data?.default?.description || '');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [variant, setVariant] = useState(data?.default?.variant || 'primary');
  const [isForClass, setIsForClass] = useState(false);
  const [classId, setClassId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [classes, setClasses] = useState<{ id: string, name: string }[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);
  
  // Format dates for inputs
  const formattedStartDate = format(startDate, 'yyyy-MM-dd');
  const formattedStartTime = format(startDate, 'HH:mm');
  const formattedEndDate = format(endDate, 'yyyy-MM-dd');
  const formattedEndTime = format(endDate, 'HH:mm');
  
  // Fetch classes for the dropdown
  useEffect(() => {
    async function fetchClasses() {
      if (!isForClass) return;
      
      setLoadingClasses(true);
      setClassError(null);
      
      try {
        const response = await fetch('/api/classes');
        if (!response.ok) {
          throw new Error('Failed to fetch classes');
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          setClasses(data);
        } else {
          setClasses([]);
          setClassError('No classes found');
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setClassError('Error loading classes');
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    }
    
    fetchClasses();
  }, [isForClass]);
  
  // Submit handler
  const handleSubmitEvent = (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    // Combine date and time for start/end
    const combinedStartDate = new Date(startDate);
    if (typeof formattedStartTime === 'string') {
      const [hours, minutes] = formattedStartTime.split(':').map(Number);
      combinedStartDate.setHours(hours, minutes);
    }
    
    const combinedEndDate = new Date(endDate);
    if (typeof formattedEndTime === 'string') {
      const [hours, minutes] = formattedEndTime.split(':').map(Number);
      combinedEndDate.setHours(hours, minutes);
    }
    
    // Create the event object
    const newEvent = {
      id: data?.default?.id || uuidv4(),
      title,
      description,
      startDate: combinedStartDate,
      endDate: combinedEndDate,
      variant,
      metadata: {
        isRecurring,
        recurringDays: selectedDays,
        classId: isForClass ? classId : undefined,
        createForStudents: isForClass,
      }
    };
    
    // Add or update the event
    if (data?.default?.id) {
      handlers.handleUpdateEvent(newEvent, data.default.id);
    } else {
      handlers.handleAddEvent(newEvent);
    }
    
    // Close the modal
    setClose();
  };
  
  // Day options for recurring events
  const dayOptions = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
  ];
  
  // Color options for event styling with orange & green theme
  const colorOptions = [
    { label: 'Orange', value: 'primary', color: '#ff9800' },
    { label: 'Green', value: 'secondary', color: '#4caf50' },
    { label: 'Red', value: 'destructive', color: '#f44336' },
    { label: 'Light Green', value: 'success', color: '#8bc34a' },
    { label: 'Amber', value: 'warning', color: '#ffc107' },
    { label: 'Gray', value: 'default', color: '#9e9e9e' },
  ];
  
  // Instead of returning a form, return a div with the form contents
  // This avoids the nested form issue
  return (
    <div className="space-y-4 p-1">
      <div>
        <Label htmlFor="title">Event Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter event title"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter event description"
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formattedStartDate}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            required
          />
        </div>
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formattedStartTime}
            onChange={(e) => {
              const [hours, minutes] = e.target.value.split(':').map(Number);
              const newDate = new Date(startDate);
              newDate.setHours(hours, minutes);
              setStartDate(newDate);
            }}
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formattedEndDate}
            onChange={(e) => setEndDate(new Date(e.target.value))}
            required
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formattedEndTime}
            onChange={(e) => {
              const [hours, minutes] = e.target.value.split(':').map(Number);
              const newDate = new Date(endDate);
              newDate.setHours(hours, minutes);
              setEndDate(newDate);
            }}
            required
          />
        </div>
      </div>
      
      <div>
        <Label className="block mb-2">Event Color</Label>
        <div className="grid grid-cols-3 gap-3">
          {colorOptions.map((color) => (
            <div 
              key={color.value} 
              className={cn(
                "flex items-center gap-2 p-3 rounded-md border cursor-pointer",
                variant === color.value ? "ring-2 ring-primary ring-offset-2" : ""
              )}
              onClick={() => setVariant(color.value)}
            >
              <div 
                className="w-5 h-5 rounded-full" 
                style={{ backgroundColor: color.color }}
              ></div>
              <span className="text-sm">{color.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isForClass"
          checked={isForClass}
          onCheckedChange={(checked) => setIsForClass(!!checked)}
        />
        <Label htmlFor="isForClass">Assign to class</Label>
      </div>
      
      {isForClass && (
        <div>
          <Label htmlFor="classId">Select Class</Label>
          {loadingClasses ? (
            <div className="flex items-center justify-center h-10 bg-muted/20 rounded-md">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : classError ? (
            <div className="text-sm text-muted-foreground p-2 border rounded-md">
              {classError}
            </div>
          ) : (
            <Select
              value={classId}
              onValueChange={setClassId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(classes) && classes.length > 0 ? 
                  classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  )) : (
                    <SelectItem value="" disabled>No classes available</SelectItem>
                  )
                }
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isRecurring"
          checked={isRecurring}
          onCheckedChange={(checked) => setIsRecurring(!!checked)}
        />
        <Label htmlFor="isRecurring">Recurring event</Label>
      </div>
      
      {isRecurring && (
        <div>
          <Label className="block mb-2">Repeat on days</Label>
          <div className="grid grid-cols-7 gap-2">
            {dayOptions.map((day) => (
              <div
                key={day.value}
                className={cn(
                  "flex items-center justify-center h-10 rounded-md border cursor-pointer text-center",
                  selectedDays.includes(day.value) 
                    ? "bg-orange-500 text-white" 
                    : "bg-background hover:bg-muted"
                )}
                onClick={() => {
                  if (selectedDays.includes(day.value)) {
                    setSelectedDays(selectedDays.filter(d => d !== day.value));
                  } else {
                    setSelectedDays([...selectedDays, day.value]);
                  }
                }}
              >
                {day.label.substring(0, 1)}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-end space-x-2 pt-2">
        <Button type="button" variant="outline" onClick={() => setClose()}>
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={handleSubmitEvent} 
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {data?.default?.id ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </div>
  );
}

export default CreateEventFormWithHook;