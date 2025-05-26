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
import { Event } from "@/src/types/scheduler";
import { UseFormRegister, FieldErrors } from 'react-hook-form';

type CreateEventFormWithHookProps = {
  register: UseFormRegister<any>;
  errors: FieldErrors;
}

export function CreateEventFormWithHook({ register, errors }: CreateEventFormWithHookProps) {
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
  
  // Handle form submission
  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Event title is required");
      return;
    }
    
    // Check if we're editing or creating a new event
    const isEditing = !!data?.default?.id;
    const eventId = isEditing ? data.default.id : uuidv4();
    
    const eventData: Event = {
      id: eventId,
      title,
      description,
      startDate,
      endDate,
      variant,
      isRecurring: false
    };
    
    if (isEditing) {
      handlers.handleUpdateEvent(eventData, eventId);
      toast.success("Event updated successfully");
    } else {
      handlers.handleAddEvent(eventData);
      toast.success("Event created successfully");
    }
    
    setClose();
  };
  
  return (
    <form onSubmit={handleSubmitEvent} className="space-y-4">
      <div>
        <Label htmlFor="title">Event Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter event title"
          className="mt-1"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter event description"
          className="mt-1"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="datetime-local"
            value={format(startDate, "yyyy-MM-dd'T'HH:mm")}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="datetime-local"
            value={format(endDate, "yyyy-MM-dd'T'HH:mm")}
            onChange={(e) => setEndDate(new Date(e.target.value))}
            className="mt-1"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="variant">Color</Label>
        <Select value={variant} onValueChange={setVariant}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Blue</SelectItem>
            <SelectItem value="success">Green</SelectItem>
            <SelectItem value="warning">Yellow</SelectItem>
            <SelectItem value="danger">Red</SelectItem>
            <SelectItem value="default">Gray</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button type="submit" className={cn("w-full", data?.default?.id ? "bg-amber-500 hover:bg-amber-600" : "")}>
        {data?.default?.id ? "Update Event" : "Create Event"}
      </Button>
    </form>
  );
}

export default CreateEventFormWithHook;