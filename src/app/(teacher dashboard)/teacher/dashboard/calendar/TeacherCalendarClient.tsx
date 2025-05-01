"use client";

import { useState, useEffect } from "react";
import { SchedulerProvider } from "@/src/providers/scheduler/schedular-provider"; 
import SchedulerViewFilteration from "@/src/components/scheduler/_components/view/schedular-view-filteration"; 
import { Event } from "@/src/types/scheduler";
import { Button } from "@/src/components/ui/button";
import { Plus, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import CreateEventDialog from "@/src/components/calendar/CreateEventDialog"; 
import CreateEventFormWithHook from "@/src/components/calendar/CreateEventFormWithHook";

export default function TeacherCalendarClient() {
  const router = useRouter();
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch calendar events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/calendar");
        
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        
        const data = await response.json();
        
        // Format events for Mina Scheduler
        const formattedEvents = data.map((event: any) => ({
          id: event.id,
          title: event.title,
          description: event.description || "",
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          variant: event.variant || "primary",
          metadata: {
            type: event.billId ? "bill" : event.assignmentId ? "assignment" : "event",
            billId: event.billId,
            assignmentId: event.assignmentId,
            classId: event.classId,
            isRecurring: event.isRecurring,
            recurringDays: event.recurringDays
          }
        }));
        
        setEvents(formattedEvents);
      } catch (error) {
        console.error("Error fetching calendar:", error);
        toast.error("Failed to load calendar");
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  // Handle event creation
  const handleEventCreated = async () => {
    // Reload events after creating a new one
    try {
      const response = await fetch("/api/calendar");
      
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      
      const data = await response.json();
      
      // Format events for Mina Scheduler
      const formattedEvents = data.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description || "",
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        variant: event.variant || "primary",
        metadata: {
          type: event.billId ? "bill" : event.assignmentId ? "assignment" : "event",
          billId: event.billId,
          assignmentId: event.assignmentId,
          classId: event.classId,
          isRecurring: event.isRecurring,
          recurringDays: event.recurringDays
        }
      }));
      
      setEvents(formattedEvents);
    } catch (error) {
      console.error("Error refreshing calendar events:", error);
      toast.error("Failed to refresh calendar");
    }
  };

  // Add an event
  const handleAddEvent = async (event: Event) => {
    try {
      // Format dates to ISO strings for the API
      const eventData = {
        ...event,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString()
      };
      
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(eventData)
      });
      
      if (!response.ok) {
        throw new Error("Failed to create event");
      }
      
      // Refresh events after adding
      handleEventCreated();
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
        endDate: event.endDate.toISOString()
      };
      
      const response = await fetch(`/api/calendar/${event.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(eventData)
      });
      
      if (!response.ok) {
        throw new Error("Failed to update event");
      }
      
      // Refresh events after updating
      handleEventCreated();
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
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete event");
      }
      
      // Remove event from local state
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      toast.success("Event deleted successfully");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  // Handle navigation to related items
  const handleNavigateToItem = (event: Event) => {
    if (event.metadata?.type === "bill" && event.metadata.billId) {
      router.push(`/teacher/dashboard/bills/${event.metadata.billId}`);
    } else if (event.metadata?.type === "assignment" && event.metadata.assignmentId) {
      router.push(`/teacher/dashboard/assignments/${event.metadata.assignmentId}`);
    }
  };

  // Custom event modal component
  const TeacherEventModal = ({ event, onClose }: { event: Event, onClose: () => void }) => {
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
          
          {event.metadata?.isRecurring && (
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
    <div className="h-[calc(100vh-82px)] flex flex-col">
      <div className="py-1 bg-background z-10 sticky top-0">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">Calendar</h1>
        </div>
      </div>
      
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
                defaultView: "month"
              }}
              classNames={{
                buttons: {
                  next: "bg-orange-500 text-white hover:bg-orange-600 text-sm py-1 px-3",
                  prev: "bg-orange-500 text-white hover:bg-orange-600 text-sm py-1 px-3",
                  addEvent: "bg-orange-500 text-white hover:bg-orange-600 text-sm"
                },
                calendar: {
                  todayCell: "current-day",
                  container: "sticky-header-calendar h-full"
                },
                tabs: {
                  wrapper: "calendar-tabs-wrapper",
                  tabList: "calendar-tab-list",
                  tab: "calendar-tab",
                  panel: "calendar-panel"
                }
              }}
              CustomComponents={{
                CustomEventModal: {
                  CustomAddEventModal: {
                    title: "Create Event",
                    CustomForm: CreateEventFormWithHook
                  },
                  CustomViewEventModal: {
                    component: TeacherEventModal,
                  }
                }
              }}
            />
          </SchedulerProvider>
        </div>
      )}
    </div>
  );
}