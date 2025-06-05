"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Event } from "@/src/types/scheduler";
import { SchedulerProvider } from "@/src/providers/scheduler/schedular-provider";
import SchedulerViewFilteration from "@/src/components/scheduler/_components/view/schedular-view-filteration";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { TodoSidebar } from "@/src/components/todo-sidebar";
import { CheckSquare, X, ChevronLeft, ChevronRight } from "lucide-react";
import { HEADER_HEIGHT } from "@/src/lib/constants/header_height";
import { cn } from "@/src/lib/utils";

export default function StudentCalendarClient() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTodoSidebar, setShowTodoSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const sidebarContainerRef = useRef<HTMLDivElement>(null);
  
  // Available height calculation (subtract header height)
  const contentHeight = `calc(100vh - ${HEADER_HEIGHT}px)`;

  // Check viewport size on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // On mobile, default to hiding the sidebar
      if (window.innerWidth < 768) {
        setShowTodoSidebar(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch calendar events
  useEffect(() => {
    fetchEvents();
  }, []);

  // Close todo sidebar on mobile when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        isMobile &&
        showTodoSidebar && 
        !target.closest('.todo-sidebar') && 
        !target.closest('.toggle-todo-btn')
      ) {
        setShowTodoSidebar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTodoSidebar, isMobile]);
  
  // Retry mechanism if initial fetch fails
  useEffect(() => {
    if (fetchAttempts > 0 && fetchAttempts < 3 && events.length === 0 && !loading) {
      const timer = setTimeout(() => {
        console.log(`Retry attempt ${fetchAttempts} for fetching events...`);
        fetchEvents();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [fetchAttempts, events, loading]);

  // Function to fetch events with better error handling
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/calendar");
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();

      const formatted = data.map((event: any) => {
        // For bills and assignments, we need special date handling
        if (event.metadata?.type === "bill" || event.metadata?.type === "assignment") {
          const date = new Date(event.startDate);
          
          // For bills, set to 12:00 PM (noon) for better visibility
          const startDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            event.metadata?.type === "bill" ? 12 : 0,
            0, 0
          );
          
          // End date for bills: 12:59 PM, assignments: 11:59:59 PM
          const endDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            event.metadata?.type === "bill" ? 12 : 23,
            event.metadata?.type === "bill" ? 59 : 59,
            event.metadata?.type === "bill" ? 0 : 59
          );

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
              isAllDay: event.metadata?.type === "assignment",
              originalDueDate: event.metadata.dueDate,
              isDueAtNoon: event.metadata?.type === "bill"
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
    } catch (error) {
      console.error("Error fetching calendar:", error);
      toast.error("Failed to load calendar");
    } finally {
      setLoading(false);
    }
  };

  // Navigation handler for different event types
  const handleNavigateToItem = (event: Event) => {
    if (event.metadata?.type === "bill" && event.metadata.billId) {
      router.push(`/student/dashboard/bank`);
    } else if (event.metadata?.type === "assignment" && event.metadata.assignmentId) {
      router.push(`/student/dashboard/classes/${event.metadata.classId}/assignments/${event.metadata.assignmentId}`);
    }
  };

  const toggleSidebar = () => {
    setShowTodoSidebar(!showTodoSidebar);
  };

  // Custom event view component
  const StudentEventView = ({ event, onClose }: { event: Event, onClose: () => void }) => (
    <div className="p-4">
      {/* Make title break into multiple lines if needed instead of overflowing */}
      <h3 className="text-lg font-semibold mb-2 break-words">{event.title}</h3>
      
      {event.description && (
        <p className="text-sm text-gray-600 mb-4">{event.description}</p>
      )}
      
      <div className="mb-4">
        {event.metadata?.isAllDay ? (
          <p className="text-sm">
            <span className="font-medium">Date: </span>
            {event.startDate.toLocaleDateString()}
          </p>
        ) : (
          <>
            <p className="text-sm">
              <span className="font-medium">Start: </span>
              {event.startDate.toLocaleString()}
            </p>
            <p className="text-sm">
              <span className="font-medium">End: </span>
              {event.endDate.toLocaleString()}
            </p>
          </>
        )}
        
        {event.metadata?.type && (
          <p className="text-sm mt-2">
            <span className="font-medium">Type: </span>
            <span className="capitalize">{event.metadata.type}</span>
          </p>
        )}
      </div>
      
      <div className="flex justify-end gap-2">
        {(event.metadata?.type === "assignment" || event.metadata?.type === "bill") && (
          <Button 
            onClick={() => {
              handleNavigateToItem(event);
              onClose();
            }}
          >
            {event.metadata.type === "assignment" ? "View Assignment" : "View Bill"}
          </Button>
        )}
        
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );

  // Add a custom CSS style block to handle long event titles
  useEffect(() => {
    // Add custom styles to handle long event titles in month view
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      /* Fix for month view cell proportions */
      .month-day-cell {
        min-height: 90px !important;
        height: auto !important;
        max-height: 160px !important;
        overflow: hidden;
      }
      
      /* Ensure consistent day number positioning */
      .calendar-day-number {
        position: relative;
        z-index: 5;
      }
      
      /* Fix event styling to prevent stretching cells */
      .month-day-cell [class*="event-container"] {
        max-width: 100% !important;
        width: 100% !important;
        overflow: hidden !important;
      }
      
      /* Ensure event titles are properly truncated */
      .month-day-cell [class*="event-container"] div[class*="truncate"] {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        width: 100%;
        display: block;
      }
      
      /* Ensure uniform cell sizing in month view */
      .month-grid {
        grid-template-rows: auto repeat(6, minmax(90px, auto)) !important;
      }
      
      /* Make truncated event title show on hover */
      .month-day-cell [class*="event-container"]:hover {
        z-index: 50 !important;
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div className="h-full flex" style={{ height: contentHeight }}>
      {/* Main Calendar Content */}
      <div 
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300 bg-white"
        style={{ 
          width: !isMobile && showTodoSidebar ? "calc(100% - 328px)" : "100%",
          maxWidth: !isMobile && showTodoSidebar ? "calc(100% - 328px)" : "100%"
        }}
      >
        {/* Title container */}
        <div className="flex items-center justify-between">
          
          {/* Show toggle button only on mobile */}
          {isMobile && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleSidebar}
              className="toggle-todo-btn mr-3"
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Todos</span>
            </Button>
          )}
        </div>
        
        {loading ? (
          <div className="flex-1 flex justify-center items-center h-full">
            <div className="animate-spin h-6 w-6 border-t-2 border-b-2 border-primary rounded-full"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <SchedulerProvider
              initialState={events.map(event => ({
                ...event,
                // Ensure we have minmized set for proper display
                minmized: true
              }))}
              // Remove the config prop and use individual props instead
              onAddEvent={() => {}} // Provide empty handler since we're disabling operations
              onUpdateEvent={() => {}} // Provide empty handler since we're disabling operations
              onDeleteEvent={() => {}} // Provide empty handler since we're disabling operations
            >
              <SchedulerViewFilteration
                views={{
                  views: ["month", "week", "day"],
                  mobileViews: ["month", "day"],
                  defaultView: "month",
                }}
                // Pass disableAPIOperations as a prop to SchedulerViewFilteration instead
                // disableAPIOperations={true}
                classNames={{
                  buttons: {
                    next: "bg-orange-500 text-white hover:bg-orange-600 text-xs sm:text-sm py-1 px-2 sm:px-3",
                    prev: "bg-orange-500 text-white hover:bg-orange-600 text-xs sm:text-sm py-1 px-2 sm:px-3",
                    addEvent: "hidden" // Students can't add events directly
                  },
                  calendar: {
                    todayCell: "current-day",
                    container: cn("sticky-header-calendar h-full bg-white", "fixed-height-cells"),
                  },
                  tabs: {
                    wrapper: "calendar-tabs-wrapper",
                    tabList: "calendar-tab-list flex bg-white border-b",
                    tab: "calendar-tab text-xs sm:text-sm px-3 py-2 whitespace-nowrap",
                    panel: "calendar-panel",
                  },
                }}
                CustomComponents={{
                  CustomEventModal: {
                    CustomViewEventModal: {
                      component: StudentEventView,
                    },
                  },
                }}
              />
            </SchedulerProvider>
          </div>
        )}
      </div>

      {/* Desktop Todo Sidebar with toggle */}
      {!isMobile && (
        <div 
          ref={sidebarContainerRef}
          className="relative" 
          style={{ minWidth: showTodoSidebar ? "340px" : "58px" }}
        >
          {/* When sidebar is open */}
          {showTodoSidebar && (
            <div 
              className="todo-sidebar bg-[#f1faf3] h-full relative overflow-auto"
              style={{ width: "340px", height: contentHeight }}
            >
              {/* Apply full width to the TodoSidebar component */}
              <div className="w-full h-full">
                <TodoSidebar showCollapseButton={false} />
              </div>
              
              {/* Toggle button at bottom left when open */}
              <div 
                className="absolute bottom-4 left-4 cursor-pointer p-2 bg-[#e8f5eb] hover:bg-[#d3eedb] rounded-full shadow-sm z-10"
                onClick={toggleSidebar}
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          )}
          
          {/* When sidebar is closed */}
          {!showTodoSidebar && (
            <div 
              className="bg-[#f1faf3] h-full flex flex-col items-center"
              style={{ width: "58px", height: contentHeight }}
            >
              {/* Spacer to push toggle to bottom */}
              <div className="flex-1"></div>
              
              {/* Toggle at bottom when closed */}
              <div 
                className="mb-4 ml-4 cursor-pointer p-2 bg-[#e8f5eb] hover:bg-[#d3eedb] rounded-full shadow-sm"
                onClick={toggleSidebar}
                style={{ alignSelf: 'flex-start' }}
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile Todo Sidebar - shows as overlay */}
      {isMobile && showTodoSidebar && (
        <>
          <div 
            className={`todo-sidebar fixed inset-y-0 right-0 w-72 sm:w-80 bg-[#f1faf3] shadow-lg z-50 
                        transition-transform duration-300 ease-in-out
                        ${showTodoSidebar ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ top: `${HEADER_HEIGHT}px`, height: contentHeight }}
          >
            <div className="absolute right-3 top-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowTodoSidebar(false)}
                className="h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="pt-12 pb-4 px-4 border-b">
              <h2 className="text-lg font-semibold">Todo List</h2>
            </div>
            
            <div className="h-[calc(100%-72px)] overflow-auto">
              <TodoSidebar showCollapseButton={false} />
            </div>
          </div>
          
          {/* Overlay background when mobile sidebar is open */}
          {showTodoSidebar && (
            <div 
              className="fixed inset-0 bg-black/30 z-40"
              style={{ top: `${HEADER_HEIGHT}px` }}
              onClick={() => setShowTodoSidebar(false)}
            />
          )}
        </>
      )}
    </div>
  );
}