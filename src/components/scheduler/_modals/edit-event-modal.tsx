"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";
import { useModal } from "@/src/providers/scheduler/modal-context";
import { format, isValid } from "date-fns";
import { Event } from "@/src/types/scheduler/index";
import { useScheduler } from "@/src/providers/scheduler/schedular-provider";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Calendar } from "lucide-react";
import { TimePicker } from "@/src/components/ui/time-picker";

export default function EditEventModal() {
  const { setClose, data } = useModal();
  const { handlers } = useScheduler();

  // Set state for form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [variant, setVariant] = useState<string>("primary");
  const [isLoading, setIsLoading] = useState(true);
  const [eventId, setEventId] = useState("");

  // Color options for events
  const colorOptions = [
    { value: "primary", label: "Blue", bgClass: "bg-blue-500 text-white" },
    { value: "success", label: "Green", bgClass: "bg-green-500 text-white" },
    { value: "warning", label: "Yellow", bgClass: "bg-yellow-500 text-black" },
    { value: "danger", label: "Red", bgClass: "bg-red-500 text-white" },
    { value: "default", label: "Gray", bgClass: "bg-gray-500 text-white" },
  ];

  // Initialize form with event data
  useEffect(() => {
    console.log("EditEventModal: Raw modal data:", data);
    
    // First check if data exists at all
    if (!data) {
      console.error("Edit form received no data");
      setIsLoading(false);
      return;
    }
    
    const eventToEdit = data.default.default;
    console.log("EditEventModal: Event data to edit:", eventToEdit);
    
    // Properly check for valid event data
    if (!eventToEdit || typeof eventToEdit !== 'object') {
      console.error("Invalid event data format:", eventToEdit);
      toast.error("Invalid event data format");
      setIsLoading(false);
      return;
    }
    
    if (!eventToEdit.id) {
      console.error("Event data missing ID:", eventToEdit);
      toast.error("Event data missing ID");
      setIsLoading(false);
      return;
    }
    
    try {
      // Set ID
      setEventId(eventToEdit.id);
      
      // Set basic fields
      setTitle(eventToEdit.title || "");
      setDescription(eventToEdit.description || "");
      setVariant(eventToEdit.variant || "primary");
      
      // Log dates for debugging
      console.log("Start date from event:", eventToEdit.startDate);
      console.log("End date from event:", eventToEdit.endDate);
      
      // Handle dates carefully
      // For startDate
      if (eventToEdit.startDate) {
        try {
          let parsedStartDate;
          
          if (eventToEdit.startDate instanceof Date) {
            parsedStartDate = eventToEdit.startDate;
          } else if (typeof eventToEdit.startDate === 'string') {
            parsedStartDate = new Date(eventToEdit.startDate);
          } else {
            console.error("Unexpected startDate format:", eventToEdit.startDate);
            parsedStartDate = new Date();
          }
          
          if (isValid(parsedStartDate)) {
            setStartDate(parsedStartDate);
            console.log("Set start date to:", parsedStartDate);
          } else {
            console.error("Invalid parsed startDate:", parsedStartDate);
            setStartDate(new Date());
          }
        } catch (dateError) {
          console.error("Error parsing startDate:", dateError);
          setStartDate(new Date());
        }
      }
      
      // For endDate - with similar careful handling
      if (eventToEdit.endDate) {
        try {
          let parsedEndDate;
          
          if (eventToEdit.endDate instanceof Date) {
            parsedEndDate = eventToEdit.endDate;
          } else if (typeof eventToEdit.endDate === 'string') {
            parsedEndDate = new Date(eventToEdit.endDate);
          } else {
            console.error("Unexpected endDate format:", eventToEdit.endDate);
            parsedEndDate = new Date();
          }
          
          if (isValid(parsedEndDate)) {
            setEndDate(parsedEndDate);
            console.log("Set end date to:", parsedEndDate);
          } else {
            console.error("Invalid parsed endDate:", parsedEndDate);
            setEndDate(new Date());
          }
        } catch (dateError) {
          console.error("Error parsing endDate:", dateError);
          setEndDate(new Date());
        }
      }
    } catch (error) {
      console.error("Error processing event data:", error);
      toast.error("Error loading event data");
    } finally {
      setIsLoading(false);
    }
  }, [data, setClose]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventId) {
      toast.error("No event ID available");
      return;
    }
    
    if (!title.trim()) {
      toast.error("Event title is required");
      return;
    }
    
    try {
      // Create updated event object
      const updatedEvent: Event = {
        id: eventId,
        title,
        description,
        startDate,
        endDate,
        variant,
        isRecurring: data?.default?.isRecurring || false,
        recurringDays: data?.default?.recurringDays || [],
        metadata: data?.default?.metadata || {},
      };
      
      console.log("Updating event:", updatedEvent);
      
      await handlers.handleUpdateEvent(updatedEvent, eventId);
      
      // Refresh events to get latest data from server
      await handlers.refreshEvents();
      
      toast.success("Event updated successfully");
      setClose();
      
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Event Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Event Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[80px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <div className="relative">
            <Input
              id="startDate"
              type="date"
              value={format(startDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  const dateParts = e.target.value.split('-').map(Number);
                  const newDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                  
                  // Preserve the time portion
                  newDate.setHours(
                    startDate.getHours(),
                    startDate.getMinutes(),
                    startDate.getSeconds(),
                    startDate.getMilliseconds()
                  );
                  
                  setStartDate(newDate);
                }
              }}
              className="pl-1 pr-8 text-center cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
              onClick={(e) => {
                (e.target as HTMLInputElement).showPicker();
              }}
            />
            <Calendar 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" 
            />
          </div>
          <div className="mt-2">
            <Label htmlFor="startTime">Start Time</Label>
            <TimePicker 
              value={startDate} 
              onChange={(date) => {
                setStartDate(date);
                console.log("Start time updated:", date);
              }} 
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <div className="relative">
            <Input
              id="endDate"
              type="date"
              value={format(endDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  const dateParts = e.target.value.split('-').map(Number);
                  const newDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                  
                  // Preserve the time portion
                  newDate.setHours(
                    endDate.getHours(),
                    endDate.getMinutes(),
                    endDate.getSeconds(),
                    endDate.getMilliseconds()
                  );
                  
                  setEndDate(newDate);
                }
              }}
              className="pl-1 pr-8 text-center cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
              onClick={(e) => {
                (e.target as HTMLInputElement).showPicker();
              }}
            />
            <Calendar 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" 
            />
          </div>
          <div className="mt-2">
            <Label htmlFor="endTime">End Time</Label>
            <TimePicker 
              value={endDate} 
              onChange={(date) => {
                setEndDate(date);
                console.log("End time updated:", date);
              }} 
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Event Color</Label>
        <div className="flex flex-wrap gap-3">
          {colorOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`w-10 h-10 rounded-full ${option.bgClass} flex items-center justify-center transition-all
                ${variant === option.value ? "ring-2 ring-offset-2 ring-blue-500" : "hover:ring-1 hover:ring-offset-1"}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              onClick={() => setVariant(option.value)}
              aria-label={option.label}
            >
              {variant === option.value && <Check size={16} />}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full">
        Update Event
      </Button>
    </form>
  );
}