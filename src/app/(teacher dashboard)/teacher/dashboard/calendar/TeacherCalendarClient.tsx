"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Event } from "@/src/types/scheduler";
import { SchedulerProvider } from "@/src/providers/scheduler/schedular-provider";
import SchedulerViewFilteration from "@/src/components/scheduler/_components/view/schedular-view-filteration";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import CreateEventFormWithHook from "@/src/components/calendar/CreateEventFormWithHook";
import { safeDateParse, createCalendarDisplayDate } from "@/src/lib/date-utils";

export default function TeacherCalendarClient() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch calendar events
  useEffect(() => {
    fetchEvents();
  }, []);

  // Function to fetch events
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/calendar");
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      const data = await response.json();
      
      console.log("Raw API events data:", data);


      

      // Format events for Mina Scheduler
      const formatted= data.map((event: any) => {
        // For bills and assignments, we need special date handling
        if (event.metadata?.type === "bill" || event.metadata?.type === "assignment") {
          // Parse the date from the API response
          const date = new Date(event.startDate);
          
          // Create start date at midnight local time
          const startDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            0, 0, 0
          );
          
          // Create end date at 11:59:59 PM local time
          const endDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            23, 59, 59
          );
      
          console.log(`Processed ${event.metadata.type} event:`, {
            id: event.id,
            title: event.title,
            originalDate: event.startDate,
            localStart: startDate.toISOString(),
            localEnd: endDate.toISOString(),
            dateComponents: {
              year: startDate.getFullYear(),
              month: startDate.getMonth() + 1,
              day: startDate.getDate()
            }
          });
      
          return {
            id: event.id,
            title: event.title,
            description: event.description || "",
            startDate: startDate,
            endDate: endDate,
            variant: event.variant || "primary",
            isRecurring: event.isRecurring === true,
            recurringDays: event.recurringDays || [],
            metadata: {
              ...event.metadata,
              isAllDay: true, // Mark as all-day event
              originalDueDate: event.metadata.dueDate // Preserve original
            },
          } as Event;
        } else {
          // For regular events, use the normal date processing
          const startDate = new Date(event.startDate);
          const endDate = new Date(event.endDate);
          
          return {
            id: event.id,
            title: event.title,
            description: event.description || "",
            startDate: startDate,
            endDate: endDate,
            variant: event.variant || "primary",
            isRecurring: event.isRecurring === true,
            recurringDays: event.recurringDays || [],
            metadata: event.metadata,
          } as Event;
        }
      });

      setEvents(formatted);
    } catch {
      toast.error("Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }

  // Add an event
  const handleAddEvent = async (event: Event) => {
    try {
      // Format dates to ISO strings for the API
      const eventData = {
        ...event,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
      };

      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error("Failed to create event");
      }

      // Refresh events after adding
      fetchEvents();
      toast.success("Event created successfully");
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Failed to create event");
    }
  };

  // Update an event
  const handleUpdateEvent = async (event: Event) => {
    try {
      // Format dates to ISO strings for the API
      const eventData = {
        ...event,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
      };

      const response = await fetch(`/api/calendar/${event.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error("Failed to update event");
      }

      // Refresh events after updating
      fetchEvents();
      toast.success("Event updated successfully");
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  // Delete an event
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      // Remove event from local state to avoid needing a full refresh
      setEvents((prevEvents) =>
        prevEvents.filter((event) => event.id !== eventId)
      );
      toast.success("Event deleted successfully");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
      // If error occurs, refresh events to ensure UI is in sync with backend
      fetchEvents();
    }
  };

  // Handle navigation to related items
  const handleNavigateToItem = (event: Event) => {
    if (event.metadata?.type === "bill" && event.metadata.billId) {
      router.push(`/teacher/dashboard/bills/${event.metadata.billId}`);
    } else if (
      event.metadata?.type === "assignment" &&
      event.metadata.assignmentId
    ) {
      router.push(`/teacher/dashboard/assignments/${event.metadata.assignmentId}`);
    } else if (event.metadata?.type === "todo" && event.metadata.todoId) {
      router.push(`/teacher/dashboard/todos/${event.metadata.todoId}`);
    }
  };

  // Custom event modal component
  const TeacherEventModal = ({
    event,
    onClose,
  }: {
    event: Event;
    onClose: () => void;
  }) => {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">{event.title || "Untitled Event"}</h2>

        {event.description && (
          <p className="text-sm text-gray-600">{event.description}</p>
        )}

        <div className="flex flex-col space-y-2 text-sm">
          <div className="flex items-center">
            <span className="font-medium mr-2">Start:</span>
            {event.startDate.toLocaleString()}
          </div>

          <div className="flex items-center">
            <span className="font-medium mr-2">End:</span>
            {event.endDate.toLocaleString()}
          </div>

          {event.isRecurring === true && (
            <div>
              <span className="font-medium mr-2">Recurring:</span>
              Yes
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4">
          {(event.metadata?.type === "bill" || event.metadata?.type === "assignment") && (
            <Button onClick={() => handleNavigateToItem(event)}>
              View {event.metadata.type === "bill" ? "Bill" : "Assignment"}
            </Button>
          )}

          <Button
            variant="destructive"
            onClick={() => {
              handleDeleteEvent(event.id);
              onClose();
            }}
          >
            Delete Event
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin h-6 w-6 border-3 border-orange-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="flex-1 border rounded-none overflow-hidden">
          <SchedulerProvider
            initialState={events}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
          >
            <SchedulerViewFilteration
              views={{
                views: ["month", "week", "day"],
                mobileViews: ["month", "day"],
                defaultView: "month",
              }}
              classNames={{
                buttons: {
                  next: "bg-orange-500 text-white hover:bg-orange-600 text-sm py-1 px-3",
                  prev: "bg-orange-500 text-white hover:bg-orange-600 text-sm py-1 px-3",
                  addEvent: "bg-orange-500 text-white hover:bg-orange-600 text-sm",
                },
                calendar: {
                  todayCell: "current-day",
                  container: "sticky-header-calendar h-full",
                },
                tabs: {
                  wrapper: "calendar-tabs-wrapper",
                  tabList: "calendar-tab-list",
                  tab: "calendar-tab",
                  panel: "calendar-panel",
                },
              }}
              CustomComponents={{
                CustomEventModal: {
                  CustomAddEventModal: {
                    title: "Create Event",
                    CustomForm: CreateEventFormWithHook,
                  },
                  CustomViewEventModal: {
                    component: TeacherEventModal,
                  },
                },
              }}
            />
          </SchedulerProvider>
        </div>
      )}
    </div>
  );
}