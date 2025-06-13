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
      const response = await fetch("/api/calendar", {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      
      const data = await response.json();
      
      // Process events with proper formatting
      const formatted = data
        // Filter out banking transactions
        .filter((event: any) => {
          // Exclude events with ADD_FUNDS or REMOVE_FUNDS transaction types
          if (event.metadata?.transactionType === "ADD_FUNDS" || 
              event.metadata?.transactionType === "REMOVE_FUNDS") {
            return false;
          }
          return true;
        })
        .map((event: any) => {
          // For bills, we need special date handling for week view
          if (event.metadata?.type === "bill") {
            // Parse the original date but preserve the time set by the server
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            
            return {
              id: event.id,
              title: event.title,
              description: event.description || "",
              startDate: startDate, // Keep the server-set time (should be 12:00 PM)
              endDate: endDate,     // Keep the server-set time (should be 12:59 PM)
              variant: event.variant || "destructive",
              isRecurring: event.isRecurring === true,
              recurringDays: event.recurringDays || [],
              recurrenceType: event.recurrenceType,
              recurrenceInterval: event.recurrenceInterval,
              monthlyDate: event.monthlyDate,
              yearlyMonth: event.yearlyMonth,
              yearlyDate: event.yearlyDate,
              metadata: {
                ...event.metadata,
                originalDueDate: event.metadata.dueDate,
                isDueAtNoon: true // Flag for week view rendering
              },
            } as Event;
          } 
          // For assignments
          else if (event.metadata?.type === "assignment") {
            const date = new Date(event.startDate);
            
            // Set assignments to show all day (00:00 to 23:59)
            const startDate = new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
              0, 0, 0
            );
            
            const endDate = new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
              23, 59, 59
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
              recurrenceType: event.recurrenceType,
              recurrenceInterval: event.recurrenceInterval,
              monthlyDate: event.monthlyDate,
              yearlyMonth: event.yearlyMonth,
              yearlyDate: event.yearlyDate,
              metadata: {
                ...event.metadata,
                isAllDay: true,
                originalDueDate: event.metadata.dueDate
              },
            } as Event;
          } 
          // For regular events (classes, etc.)
          else {
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
              recurrenceType: event.recurrenceType,
              recurrenceInterval: event.recurrenceInterval,
              monthlyDate: event.monthlyDate,
              yearlyMonth: event.yearlyMonth,
              yearlyDate: event.yearlyDate,
              metadata: event.metadata,
            } as Event;
          }
        });

      setEvents(formatted);
      setFetchAttempts(prev => prev + 1);
    } catch (error) {
      console.error("Error fetching calendar:", error);
      toast.error("Failed to load calendar");
      setFetchAttempts(prev => prev + 1);
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
    <div className="p-4 space-y-4 mb-4">
      <h2 className="text-lg font-semibold break-words">{event.title || "Untitled Event"}</h2>
      
      {event.description && (
        <p className="text-sm text-gray-600">{event.description}</p>
      )}
      
      <div className="flex flex-col space-y-2 text-sm">
        {event.metadata?.isAllDay ? (
          <div className="flex items-center">
            <span className="font-medium mr-2">Date:</span>
            {event.startDate.toLocaleDateString()}
          </div>
        ) : (
          <>
            <div className="flex items-center">
              <span className="font-medium mr-2">Start:</span>
              {event.startDate.toLocaleString()}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">End:</span>
              {event.endDate.toLocaleString()}
            </div>
          </>
        )}
        
        {event.metadata?.type && (
          <div className="flex items-center">
            <span className="font-medium mr-2">Type:</span>
            <span className="capitalize">{event.metadata.type}</span>
          </div>
        )}
        
        {event.isRecurring === true && (
          <div>
            <span className="font-medium mr-2">Recurring:</span>
            Yes
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
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

  // Replace the existing useEffect hook for styling with this more comprehensive version
  useEffect(() => {
    // Create a single style element for all calendar fixes
    const styleElement = document.createElement('style');
    styleElement.id = 'calendar-comprehensive-fixes';
    
    // Comprehensive styles that address all layout issues
    styleElement.textContent = `
      /* Base container fixes */
      .mina-scheduler-container {
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        box-sizing: border-box !important;
      }
      
      /* Month view grid layout with proper cell distribution */
      .month-grid {
        display: grid !important;
        grid-template-columns: repeat(7, 1fr) !important;
        grid-template-rows: auto repeat(6, minmax(90px, 1fr)) !important;
        width: 100% !important;
        box-sizing: border-box !important;
        overflow: visible !important;
      }
      
      /* Month day cell sizing and positioning */
      .month-day-cell {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        min-height: 90px !important;
        height: auto !important;
        max-height: 160px !important;
        overflow: hidden !important;
        position: relative !important;
        box-sizing: border-box !important;
        padding: 4px !important;
      }
      
      /* Event item container constraints */
      .month-day-cell [data-event-item],
      .week-view-grid [data-event-item] {
        max-width: 100% !important;
        width: 100% !important;
        overflow: hidden !important;
        margin-bottom: 2px !important;
        box-sizing: border-box !important;
        position: relative !important;
      }
      
      /* All event content elements must respect container */
      .month-day-cell [data-event-item] *,
      .week-view-grid [data-event-item] * {
        max-width: 100% !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        box-sizing: border-box !important;
      }
      
      /* Target specific event content elements */
      .event-item-title,
      .event-title,
      .event-content,
      [data-event-item] .truncate,
      [data-event-item] [class*="title"],
      [data-event-item] h3,
      [data-event-item] h4,
      [data-event-item] p,
      [data-event-item] div {
        max-width: 100% !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        display: block !important;
        box-sizing: border-box !important;
      }
      
      /* Event containers */
      [class*="event-container"] {
        max-width: 100% !important;
        width: 100% !important;
        position: relative !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
      
      /* Nested event elements */
      [class*="event-container"] > div,
      [class*="event-content"] > div,
      [class*="event-title"],
      [class*="event-text"] {
        max-width: 100% !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      
      /* Main scrollable areas */
      .calendar-panel {
        overflow-x: hidden !important;
        overflow-y: auto !important;
        height: calc(100vh - 170px) !important;
        max-width: 100% !important;
        width: 100% !important;
      }
      
      /* Main calendar container */
      .sticky-header-calendar {
        overflow-y: auto !important;
        overflow-x: hidden !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      /* Ensure background colors don't cause overflow */
      [style*="background-color"] {
        max-width: 100% !important;
        overflow: hidden !important;
      }
      
      /* Improved hover effect for event titles */
      .month-day-cell [data-event-item]:hover {
        position: relative !important;
        z-index: 50 !important;
      }
      
      .month-day-cell [data-event-item]:hover [class*="title"],
      .month-day-cell [data-event-item]:hover [class*="event-text"],
      .month-day-cell [data-event-item]:hover .truncate {
        position: absolute !important;
        background-color: inherit !important;
        padding: 2px 4px !important;
        border-radius: 2px !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        white-space: normal !important;
        word-break: break-word !important;
        min-width: 100% !important;
        max-width: 250px !important;
        z-index: 51 !important;
      }
      
      /* Week view specific fixes */
      .week-view-grid {
        table-layout: fixed !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      
      .week-view-grid td {
        position: relative !important;
        overflow: hidden !important;
        width: calc(100% / 7) !important;
        max-width: calc(100% / 7) !important;
        box-sizing: border-box !important;
      }
      
      .week-view-hour-cell {
        box-sizing: border-box !important;
        position: relative !important;
        overflow: hidden !important;
      }
      
      /* Fix day column headers */
      .mina-scheduler-column-header {
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
      
      /* Mobile specific adjustments */
      @media (max-width: 640px) {
        .month-day-cell {
          min-height: 60px !important;
          padding: 2px !important;
        }
        
        .calendar-panel {
          height: calc(100vh - 150px) !important;
        }
        
        .month-day-cell [data-event-item] {
          font-size: 0.75rem !important;
        }
      }
    `;
    
    // Remove any existing style elements to avoid conflicts
    const existingStyle1 = document.getElementById('calendar-cell-fixes');
    if (existingStyle1) {
      document.head.removeChild(existingStyle1);
    }
    
    const existingStyle2 = document.getElementById('calendar-fix-styles');
    if (existingStyle2) {
      document.head.removeChild(existingStyle2);
    }
    
    const existingStyle3 = document.getElementById('calendar-comprehensive-fixes');
    if (existingStyle3) {
      document.head.removeChild(existingStyle3);
    }
    
    // Add the new comprehensive style element
    document.head.appendChild(styleElement);
    
    return () => {
      // Clean up
      const styleToRemove = document.getElementById('calendar-comprehensive-fixes');
      if (styleToRemove) {
        document.head.removeChild(styleToRemove);
      }
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