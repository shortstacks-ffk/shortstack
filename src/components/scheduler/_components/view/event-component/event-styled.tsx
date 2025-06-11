"use client";

import React from "react";
import { useModal } from "@/src/providers/scheduler/modal-context";
import { Event, CustomEventModal } from "@/src/types/scheduler/index";
import { TrashIcon, ClockIcon, Edit2 } from "lucide-react";
import { useScheduler } from "@/src/providers/scheduler/schedular-provider";
import { cn } from "@/src/lib/utils";
import CustomModal from "@/src/components/ui/custom-modal";
import AddEventModal from "@/src/components/scheduler/_modals/add-event-modal";
import EditEventModal from "@/src/components/scheduler/_modals/edit-event-modal";
import { toast } from "react-hot-toast";
import { Button } from "@/src/components/ui/button";

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
  // Default to "event" type if no specific type is set
  const effectiveType = type === "" ? "event" : type;
  const raw =
    effectiveType === "bill"
      ? "danger"
      : effectiveType === "assignment"
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
          {/* <div className="font-semibold whitespace-nowrap truncate">
            {event.title}
          </div> */}
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


          {/* {
            ["bill"].includes(type) && (
              <div className="text-xs opacity-80">
                Frequency:{event.metadata?.frequency || "One-time"}
                
              </div>
            )
          } */}

          {/* only allow editing on "event" type events (not todo, bill, assignment) */}
          {effectiveType === "event" && (
            <div className="flex items-center space-x-2 mt-4">
              <button
                className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditEvent(event);
                }}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </button>
              <button
                className="flex items-center px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteEvent(event.id);
                }}
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
    // Close the details modal first
    setOpen(null);
    
    // First, make sure we have a valid event with an ID
    if (!eventToEdit || !eventToEdit.id) {
      console.error("Invalid event data for editing:", eventToEdit);
      toast.error("Cannot edit this event: missing data");
      return;
    }
    
    // Create a completely new object to avoid reference issues
    const cleanEventData = {
      id: eventToEdit.id,
      title: eventToEdit.title || "",
      description: eventToEdit.description || "",
      startDate: new Date(),
      endDate: new Date(),
      variant: eventToEdit.variant || "primary",
      isRecurring: Boolean(eventToEdit.isRecurring),
      recurringDays: Array.isArray(eventToEdit.recurringDays) ? [...eventToEdit.recurringDays] : [],
      metadata: eventToEdit.metadata ? {...eventToEdit.metadata} : {}
    };

    // Process dates first outside the try-catch to ensure they're valid
    if (eventToEdit.startDate) {
      cleanEventData.startDate = new Date(eventToEdit.startDate);
    }
    
    if (eventToEdit.endDate) {
      cleanEventData.endDate = new Date(eventToEdit.endDate);
    }

    console.log("Opening edit modal with data:", cleanEventData);

    // Open modal immediately without timeout
    setOpen(
      <CustomModal title="Edit Event">
        <EditEventModal />
      </CustomModal>,
      { default: cleanEventData }
    );
  };

  // Handle deleting an event
  const handleDeleteEvent = async (id: string) => {
    try {
      // Close any open modals first
      setOpen(null);
      
      // Show a nicer confirmation dialog instead of using window.confirm
      setOpen(
        <CustomModal title="Confirm Deletion">
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-700">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOpen(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={async () => {
                  setOpen(null);
                  
                  try {
                    // Call API to delete the event from the database
                    const response = await fetch(`/api/calendar/${id}`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                    });
                    
                    const responseData = await response.json();
                    
                    if (!response.ok) {
                      throw new Error(responseData.error || 'Failed to delete event');
                    }
                    
                    // Only update UI after successful API call
                    if (onDelete) {
                      onDelete(id);
                    }
                    
                    // Update local state - don't call handlers.handleDeleteEvent as it'll already be gone
                    // Just refresh events to get the latest state
                    await handlers.refreshEvents();
                    
                    // Success notification
                    toast.success("Event deleted successfully");
                  } catch (error) {
                    console.error("Error deleting event:", error);
                    toast.error(error instanceof Error ? error.message : "Failed to delete event");
                    
                    // Always refresh events to ensure UI is in sync with server
                    await handlers.refreshEvents();
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </CustomModal>
      );
    } catch (error) {
      console.error("Error in deletion dialog:", error);
      toast.error("An error occurred");
      await handlers.refreshEvents();
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

        {/* {!event.minmized &&
           (
            <div className="flex flex-col text-xs opacity-90 mt-1">
              <div>
                {formatDate(event.endDate)}
              </div>
            </div>
          )} */}

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


