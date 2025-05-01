"use client";

import React from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { useModal } from "@/src/providers/scheduler/modal-context";
import AddEventModal from "@/src/components/scheduler/_modals/add-event-modal";
import { Event, CustomEventModal } from "@/types";
import { TrashIcon, CalendarIcon, ClockIcon } from "lucide-react";
import { useScheduler } from "@/src/providers/scheduler/schedular-provider";
import { motion } from "framer-motion";
import { cn } from "@/src/lib/utils";
import CustomModal from "@/src/components/ui/custom-modal";

// Function to format date
const formatDate = (date: Date) => {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};

// Function to format time only
const formatTime = (date: Date) => {
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};

// Color variants based on event type
const variantColors = {
  primary: {
    bg: "bg-blue-100",
    border: "border-blue-200",
    text: "text-blue-800",
  },
  danger: {
    bg: "bg-red-100",
    border: "border-red-200",
    text: "text-red-800",
  },
  success: {
    bg: "bg-green-100",
    border: "border-green-200",
    text: "text-green-800",
  },
  warning: {
    bg: "bg-yellow-100",
    border: "border-yellow-200",
    text: "text-yellow-800",
  },
};

interface EventStyledProps extends Event {
  minmized?: boolean;
  CustomEventComponent?: React.FC<Event>;
}

export default function EventStyled({
  event,
  onDelete,
  CustomEventModal,
}: {
  event: EventStyledProps;
  CustomEventModal?: CustomEventModal;
  onDelete?: (id: string) => void;
}) {
  const { setOpen } = useModal();
  const { handlers } = useScheduler();

  // Determine if delete button should be shown
  // Hide it for minimized events to save space, show on hover instead
  const shouldShowDeleteButton = !event?.minmized;

  // Handler function
  function handleEditEvent(event: Event) {
    // Open the modal with the content
    setOpen(
      <CustomModal title="Edit Event">
        <AddEventModal
          CustomAddEventModal={
            CustomEventModal?.CustomAddEventModal?.CustomForm
          }
        />
      </CustomModal>,
      async () => {
        return {
          ...event,
        };
      }
    );
  }

  // Get background color class based on variant
  const getBackgroundColor = (variant: string | undefined) => {
    const variantKey = variant as keyof typeof variantColors || "primary";
    const colors = variantColors[variantKey] || variantColors.primary;
    return `${colors.bg} ${colors.text} ${colors.border}`;
  };

  return (
    <div
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        handleEditEvent({
          id: event?.id,
          title: event?.title,
          startDate: event?.startDate,
          endDate: event?.endDate,
          description: event?.description,
          variant: event?.variant,
        });
      }}
      className={cn(
        "bg-primary text-white dark:bg-primary-900 dark:text-white h-full rounded-md select-none cursor-pointer hover:shadow-md transition-shadow overflow-hidden px-1.5 py-1 flex items-start", // Reduced padding
        event.minmized && "min-h-[20px] text-xs", // Smaller text and height for minimized view
        `scheduler-event-${event.variant || "primary"}`
      )}
    >
      <div className="w-full truncate">
        <div className={cn("font-medium mb-0.5 truncate", event.minmized && "text-xs")}> {/* Smaller text */}
          {event.title || "Untitled Event"}
        </div>
        
        {!event.minmized && event.description && (
          <div className="text-xs mb-1 truncate">{event.description}</div>
        )}

        {!event.minmized && (
          <div className="flex flex-col text-xs opacity-90">
            <div>
              {formatDate(event.startDate)} {formatTime(event.startDate)}
            </div>
            <div>
              {formatDate(event.endDate)} {formatTime(event.endDate)}
            </div>
          </div>
        )}
        
        {event.minmized && (
          <span className="text-2xs opacity-85 truncate">{formatTime(event.startDate)}</span>
        )}
      </div>
    </div>
  );
}
