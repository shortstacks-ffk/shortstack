"use client";

import React, { useState, useEffect, useRef } from "react";
import { format, differenceInMinutes } from "date-fns";
import { Clock } from "lucide-react";
import { Button } from "./button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { cn } from "@/src/lib/utils";

interface TimePickerProps {
  isEndTime?: boolean;
  scheduleStartTime?: string; // Pass the schedule's start time as string "HH:mm"
  value: Date;
  onChange: (time: Date) => void;
  className?: string;
}

export function TimePicker({ 
  isEndTime = false, 
  scheduleStartTime, 
  value, 
  onChange, 
  className 
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeListRef = useRef<HTMLDivElement>(null);

  // Generate time slots every 15 minutes from 12:00 AM to 11:45 PM
  const generateTimeSlots = () => {
    const times = [];
    for (let hours = 0; hours < 24; hours++) {
      for (let minutes = 0; minutes < 60; minutes += 15) {
        const time = new Date();
        time.setHours(hours, minutes, 0, 0);
        times.push(time);
      }
    }
    return times;
  };

  const timeSlots = generateTimeSlots();

  // Calculate duration from schedule's start time to current time
  const calculateDuration = (time: Date) => {
    if (!isEndTime || !scheduleStartTime) return null;
    
    try {
      const [startHours, startMins] = scheduleStartTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(startHours, startMins, 0, 0);
      
      const diffMins = differenceInMinutes(time, startDate);
      
      if (diffMins <= 0) return null; // Don't show if end time is before start
      
      if (diffMins < 60) {
        return `(${diffMins} mins)`;
      } else if (diffMins % 60 === 0) {
        return `(${diffMins / 60} hr${diffMins > 60 ? "s" : ""})`;
      } else {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `(${hours} hr${hours > 1 ? "s" : ""} ${mins} mins)`;
      }
    } catch {
      return null;
    }
  };

  // Scroll to selected time when popover opens
  useEffect(() => {
    if (isOpen && timeListRef.current) {
      const timerId = setTimeout(() => {
        if (timeListRef.current) {
          const selectedEl = timeListRef.current.querySelector('[data-selected="true"]');
          if (selectedEl) {
            selectedEl.scrollIntoView({
              block: "center",
              behavior: "smooth"
            });
          }
        }
      }, 100);

      return () => clearTimeout(timerId);
    }
  }, [isOpen, value]);

  const handleTimeSelect = (time: Date) => {
    onChange(time);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value ? format(value, "h:mm a") : "Select time"}
          <Clock className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <div 
          ref={timeListRef}
          className="max-h-[300px] w-56 overflow-y-auto py-2"
          onWheel={e => {
            e.preventDefault();
            e.currentTarget.scrollTop += e.deltaY;
          }}
        >
          {timeSlots.map((time, index) => {
            const isSelected = value && 
              time.getHours() === value.getHours() && 
              time.getMinutes() === value.getMinutes();
            const duration = isEndTime ? calculateDuration(time) : null;
            
            return (
              <div
                key={index}
                data-selected={isSelected}
                className={cn(
                  "px-4 py-2 text-sm cursor-pointer flex justify-between items-center",
                  isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
                )}
                onClick={() => handleTimeSelect(time)}
              >
                <span>{format(time, "h:mm a")}</span>
                {duration && (
                  <span className="text-muted-foreground text-xs ml-4">
                    {duration}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}