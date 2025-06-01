"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";
import { useModal } from "@/src/providers/scheduler/modal-context";
import { format, isValid, parseISO } from "date-fns";
import { Event } from "@/src/types/scheduler/index";
import { useScheduler } from "@/src/providers/scheduler/schedular-provider";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Check } from "lucide-react";


export default function AddEventModal({
  CustomAddEventModal,
}: {
  CustomAddEventModal?: React.FC<{ register: any; errors: any }>;
}) {
  const { setClose, data } = useModal();
  const { handlers } = useScheduler();
  
  // Initialize with current date and one hour later as defaults - STORE IN REF
  const defaultDatesRef = useRef({
    now: new Date(),
    oneHourLater: new Date(new Date().getTime() + 60 * 60 * 1000)
  });
  
  // Form state with safer defaults
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>(defaultDatesRef.current.now);
  const [endDate, setEndDate] = useState<Date>(defaultDatesRef.current.oneHourLater);
  const [variant, setVariant] = useState<string>("primary");
  const [isFormReady, setIsFormReady] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Safe format function for date inputs
  const safeFormat = (date: Date, formatString: string): string => {
    try {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return format(new Date(), formatString);
      }
      return format(date, formatString);
    } catch (error) {
      console.error("Date formatting error:", error);
      return "";
    }
  };
  
  // Log data on component load to debug
  useEffect(() => {
    console.log("Modal context data:", data);
    // Check data and extract event for edit mode
    const eventToEdit = data?.default;
    const isEdit = Boolean(eventToEdit?.id);
    
    console.log("Event to edit:", eventToEdit);
    console.log("Is edit mode:", isEdit);
    
    // Set edit mode explicitly
    setIsEditMode(isEdit);

    // Reset form with defaults first
    setTitle("");
    setDescription("");
    setStartDate(defaultDatesRef.current.now);
    setEndDate(defaultDatesRef.current.oneHourLater);
    setVariant("primary");
    
    // If we have event data, populate the form
    if (eventToEdit && isEdit) {
      console.log("Setting form data for edit mode:", eventToEdit);
      
      setTitle(eventToEdit.title || "");
      setDescription(eventToEdit.description || "");
      setVariant(eventToEdit.variant || "primary");
      
      if (eventToEdit.startDate) {
        try {
          const startDate = new Date(eventToEdit.startDate);
          if (isValid(startDate)) {
            setStartDate(startDate);
            console.log("Start date set:", startDate);
          }
        } catch (err) {
          console.error("Error setting start date:", err);
        }
      }
      
      if (eventToEdit.endDate) {
        try {
          const endDate = new Date(eventToEdit.endDate);
          if (isValid(endDate)) {
            setEndDate(endDate);
            console.log("End date set:", endDate);
          }
        } catch (err) {
          console.error("Error setting end date:", err);
        }
      }
    }
    
    // Mark form as ready after a brief delay
    const timer = setTimeout(() => setIsFormReady(true), 100);
    
    // Clean up timer on unmount
    return () => clearTimeout(timer);
  }, [data]); // Remove now and oneHourLater from dependencies

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Event title is required");
      return;
    }

    // Create event object
    const event: Event = {
      id: data?.default?.id || uuidv4(), // Use existing ID if editing
      title,
      description,
      startDate,
      endDate,
      variant,
      isRecurring: data?.default?.isRecurring || false,
      recurringDays: data?.default?.recurringDays || [],
      metadata: data?.default?.metadata || {}
    };

    console.log(`${isEditMode ? 'UPDATING' : 'CREATING'} EVENT:`, event);

    // Use the correct handler based on edit mode
    if (isEditMode) {
      handlers.handleUpdateEvent(event, event.id);
      toast.success("Event updated successfully");
    } else {
      handlers.handleAddEvent(event);
      toast.success("Event created successfully");
    }

    setClose();
  };

  // Color options for events
  const colorOptions = [
    { value: "primary", label: "Blue", bgClass: "bg-blue-500 text-white" },
    { value: "success", label: "Green", bgClass: "bg-green-500 text-white" },
    { value: "warning", label: "Yellow", bgClass: "bg-yellow-500 text-black" },
    { value: "danger", label: "Red", bgClass: "bg-red-500 text-white" },
    { value: "default", label: "Gray", bgClass: "bg-gray-500 text-white" },
  ];
  
  // If CustomAddEventModal is provided, use it instead
  if (CustomAddEventModal) {
    return <CustomAddEventModal register={{}} errors={{}} />;
  }

  if (!isFormReady) {
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
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="datetime-local"
            value={safeFormat(startDate, "yyyy-MM-dd'T'HH:mm")}
            onChange={(e) => {
              try {
                const newDate = new Date(e.target.value);
                if (isValid(newDate)) {
                  setStartDate(newDate);
                }
              } catch (error) {
                console.error("Error parsing start date:", error);
              }
            }}
          />
        </div>
        
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="datetime-local"
            value={safeFormat(endDate, "yyyy-MM-dd'T'HH:mm")}
            onChange={(e) => {
              try {
                const newDate = new Date(e.target.value);
                if (isValid(newDate)) {
                  setEndDate(newDate);
                }
              } catch (error) {
                console.error("Error parsing end date:", error);
              }
            }}
          />
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
                ${variant === option.value ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:ring-1 hover:ring-offset-1'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              onClick={() => setVariant(option.value)}
              aria-label={option.label}
            >
              {variant === option.value && <Check size={16} />}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
      >
        {isEditMode ? "Update Event" : "Create Event"}
      </Button>
    </form>
  );
}