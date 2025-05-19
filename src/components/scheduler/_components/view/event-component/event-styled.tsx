"use client";

import React from "react";
import { useModal } from "@/src/providers/scheduler/modal-context";
import { Event, CustomEventModal } from "@/src/types/scheduler/index";
import { TrashIcon, ClockIcon, Edit2 } from "lucide-react";
import { useScheduler } from "@/src/providers/scheduler/schedular-provider";
import { cn } from "@/src/lib/utils";
import CustomModal from "@/src/components/ui/custom-modal";
import AddEventModal from "@/src/components/scheduler/_modals/add-event-modal";

const formatDate = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};

const variantColors = {
  default: { bg: "bg-gray-100", border: "border-gray-200", text: "text-gray-800" },
  primary: { bg: "bg-blue-100", border: "border-blue-200", text: "text-blue-800" },
  success: { bg: "bg-green-100", border: "border-green-200", text: "text-green-800" },
  warning: { bg: "bg-yellow-100", border: "border-yellow-200", text: "text-yellow-800" },
  danger: { bg: "bg-red-100", border: "border-red-200", text: "text-red-800" },
};

interface EventStyledProps extends Event {
  minmized?: boolean;
  CustomEventComponent?: React.FC<Event>;
  variant?: string;
  metadata?: {
    type?: string;
    [key: string]: any;
  };
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

  // pick override color for bill/assignment, else event.variant, else "default"
  const type = event.metadata?.type || "";
  const raw =
    type === "bill"
      ? "danger"
      : type === "assignment"
      ? "warning"
      : event.variant || "default";
  // ensure it's one of our keys
  const displayVariant = (variantColors[raw as keyof typeof variantColors]
    ? raw
    : "default") as keyof typeof variantColors;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(
      <CustomModal title={event.title || "Details"}>
        <div className="space-y-2">
          <div className="font-semibold whitespace-nowrap truncate">
            {event.title}
          </div>
          {event.description && (
            <div className="text-sm opacity-90">{event.description}</div>
          )}
          {/* hide times for bills & assignments */}
          {!["bill", "assignment"].includes(type) && (
            <div className="text-xs opacity-80">
              <ClockIcon className="inline-block mr-1 h-4 w-4 align-text-bottom" />
              {formatDate(event.startDate)} – {formatDate(event.endDate)}
            </div>
          )}
          {/* only allow editing on "event" and "todo" */}
          {["event", "todo"].includes(type) && (
            <div className="flex items-center space-x-2 mt-4">
              <button
                className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                onClick={() => handleEditEvent(event)}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </button>
              <button
                className="flex items-center px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
                onClick={() => handleDeleteEvent(event.id)}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          )}
        </div>
      </CustomModal>,
      async () => ({ ...event })
    );
  };

  // Handle editing an event
  const handleEditEvent = (eventToEdit: Event) => {
    setOpen(
      <CustomModal title="Edit Event">
        <AddEventModal />
      </CustomModal>,
      async () => ({ default: { ...eventToEdit } }) // Ensure we pass a copy
    );
  };

  // Handle deleting an event
  const handleDeleteEvent = (id: string) => {
    // Close any open modals first
    setOpen(null);

    // Call the delete handler from the scheduler context
    handlers.handleDeleteEvent(id);

    // Call the onDelete prop if provided (for local state updates)
    if (onDelete) {
      onDelete(id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        variantColors[displayVariant].bg,
        variantColors[displayVariant].text,
        "h-full rounded-sm select-none cursor-pointer hover:brightness-95 transition-all overflow-hidden px-1.5 py-1 flex flex-col justify-between border-l-4 relative",
        variantColors[displayVariant].border,
        // minimized pill styling
        event.minmized && "min-h-[20px] text-xs py-0.5"
      )}
    >
      <div className="w-full truncate">
        <div
          className={cn(
            "font-medium whitespace-nowrap truncate",
            event.minmized && "text-xs"
          )}
        >
          {event.title || "Untitled Event"}
        </div>

        {!event.minmized && event.description && (
          <div className="text-xs mb-1 opacity-90 truncate">{event.description}</div>
        )}

        {!event.minmized &&
           (
            <div className="flex flex-col text-xs opacity-90 mt-1">
              <div>
                {formatDate(event.endDate)}
              </div>
            </div>
          )}

        {!event.minmized &&
          !["bill", "assignment"].includes(event.metadata?.type || "") && (
            <div className="flex flex-col text-xs opacity-90 mt-1">
              <div>
                {formatDate(event.startDate)} – {formatDate(event.endDate)}
              </div>
            </div>
          )}

        {event.minmized &&
          !["bill", "assignment"].includes(event.metadata?.type || "") && (
            <span className="text-2xs opacity-90 truncate">
              {formatDate(event.startDate)}
            </span>
          )}
      </div>

      {/* Only show recurring icon if isRecurring is explicitly true */}
      {event.isRecurring === true && (
        <div className="absolute top-1 right-1 opacity-70">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
        </div>
      )}
    </div>
  );
}


