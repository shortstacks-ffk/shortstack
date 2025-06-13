"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";
import { useModal } from "@/src/providers/scheduler/modal-context";
import { format } from "date-fns";
import { Event } from "@/src/types/scheduler/index";
import { useScheduler } from "@/src/providers/scheduler/schedular-provider";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Calendar } from "lucide-react";
import { TimePicker } from "@/src/components/ui/time-picker";

export default function AddEventModal({
  CustomAddEventModal,
}: {
  CustomAddEventModal?: React.FC<{ register: any; errors: any }>;
}) {
  const { setClose, data } = useModal();
  const { handlers } = useScheduler();

  // Initialize with current date and one hour later as defaults
  const defaultDatesRef = useRef({
    now: new Date(),
    oneHourLater: new Date(new Date().getTime() + 60 * 60 * 1000),
  });

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>(defaultDatesRef.current.now);
  const [endDate, setEndDate] = useState<Date>(defaultDatesRef.current.oneHourLater);
  const [variant, setVariant] = useState<string>("primary");
  const [isFormReady, setIsFormReady] = useState(false);

  // Initialize form with any preset data (for default dates/times)
  useEffect(() => {
    console.log("Modal context data:", data);
    
    // If data contains preset dates, use them
    if (data?.default) {
      const preset = data.default;
      
      if (preset.startDate) {
        setStartDate(new Date(preset.startDate));
      }
      
      if (preset.endDate) {
        setEndDate(new Date(preset.endDate));
      }
    }

    // Mark form as ready
    const timer = setTimeout(() => setIsFormReady(true), 100);
    return () => clearTimeout(timer);
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Event title is required");
      return;
    }

    try {
      // Create new event object
      const event: Event = {
        id: uuidv4(),
        title,
        description,
        startDate,
        endDate,
        variant,
        isRecurring: false,
        recurringDays: [],
        metadata: { type: 'event' },
      };

      console.log("CREATING EVENT:", event);

      await handlers.handleAddEvent(event);
      toast.success("Event created successfully");

      // Close the modal
      setClose();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    }
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
        Create Event
      </Button>
    </form>
  );
}