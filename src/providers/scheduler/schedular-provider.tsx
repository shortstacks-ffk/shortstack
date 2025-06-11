"use client";

// SchedulerContext.tsx
import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  Dispatch,
  useEffect,
  useCallback,
  useState,
} from "react";
import { z } from "zod";

import {
  Action,
  Event,
  Getters,
  Handlers,
  SchedulerContextType,
  startOfWeek,
} from "@/src/types/scheduler/index";
import ModalProvider, { ModalContext } from "./modal-context"; // Import ModalContext
import CustomModal from "@/src/components/ui/custom-modal"; // Import CustomModal component
import AddEventModal from "@/src/components/scheduler/_modals/add-event-modal"; 
// Define event and state types

interface SchedulerState {
  events: Event[];
}

// Define the variant options
export const variants = [
  "success",
  "primary",
  "default",
  "warning",
  "danger",
] as const;

// Initial state
const initialState: SchedulerState = {
  events: [],
};

// Reducer function
const schedulerReducer = (
  state: SchedulerState,
  action: Action
): SchedulerState => {
  switch (action.type) {
    case "ADD_EVENT":
      return { ...state, events: [...state.events, action.payload] };

    case "REMOVE_EVENT":
      return {
        ...state,
        events: state.events.filter((event) => event.id !== action.payload.id),
      };
    case "UPDATE_EVENT":
      return {
        ...state,
        events: state.events.map((event) =>
          event.id === action.payload.id ? action.payload : event
        ),
      };
    case "SET_EVENTS":
      return { ...state, events: action.payload };

    default:
      return state;
  }
};

// Create the context with the correct type
const SchedulerContext = createContext<SchedulerContextType | undefined>(
  undefined
);

// Provider component
export const SchedulerProvider = ({
  children,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  initialState,
  weekStartsOn = "sunday",
}: {
  onAddEvent?: (event: Event) => void;
  onUpdateEvent?: (event: Event) => void;
  onDeleteEvent?: (id: string) => void;
  weekStartsOn?: startOfWeek;
  children: ReactNode;
  initialState?: Event[];
}) => {
  const [state, dispatch] = useReducer(
    schedulerReducer,
    { events: initialState ?? [] } // Sets initialState or an empty array as the default
  );
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  // Access the modal context
  const modalContext = useContext(ModalContext);

  useEffect(() => {
    if (initialState) {
      dispatch({ type: "SET_EVENTS", payload: initialState });
    }
  }, [initialState]);

  useEffect(() => {
    // Fetch calendar events including those linked to todos
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/calendar");
        if (!response.ok) throw new Error("Failed to fetch events");
        const data = await response.json();

        // Map the data to ensure all date properties are Date objects
        const formattedEvents = data.map((event: any) => ({
          ...event,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
        }));

        setEvents(formattedEvents);
      } catch (error) {
        console.error("Error fetching calendar events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Add this function to the SchedulerProvider component
  const refreshEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/calendar");
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();

      // Map the data to ensure all date properties are Date objects
      const formattedEvents = data.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
      }));

      setEvents(formattedEvents);
      dispatch({ type: "SET_EVENTS", payload: formattedEvents });
    } catch (error) {
      console.error("Error refreshing calendar events:", error);
    } finally {
      setLoading(false);
    }
  };

  // global getters
  const getDaysInMonth = (month: number, year: number) => {
    return Array.from(
      { length: new Date(year, month + 1, 0).getDate() },
      (_, index) => ({
        day: index + 1,
        events: [],
      })
    );
  };

  const getDaysInWeek = (week: number, year: number) => {
    // Determine if the week should start on Sunday (0) or Monday (1)
    const startDay = weekStartsOn === "sunday" ? 0 : 1;

    // Get January 1st of the year
    const janFirst = new Date(year, 0, 1);

    // Calculate how many days we are offsetting from January 1st
    const janFirstDayOfWeek = janFirst.getDay();

    // Calculate the start of the week by finding the correct day in the year
    const weekStart = new Date(janFirst);
    weekStart.setDate(
      janFirst.getDate() +
        (week - 1) * 7 +
        ((startDay - janFirstDayOfWeek + 7) % 7)
    );

    // Generate the week's days
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const getWeekNumber = (date: Date) => {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
    return weekNo;
  };

  // Helper function to filter events for a specific day
  // This function is used to get events for a specific day in the month

// Update the shouldEventAppearOnDate function
const shouldEventAppearOnDate = (event: Event, targetDate: Date): boolean => {
  const eventStartDate = new Date(event.startDate);
  
  // First, check if the date matches original event date
  const isSameOriginalDate = 
    eventStartDate.getFullYear() === targetDate.getFullYear() &&
    eventStartDate.getMonth() === targetDate.getMonth() &&
    eventStartDate.getDate() === targetDate.getDate();
    
  // If it's the original date and we should start on original date, return true immediately
  const shouldShowOnOriginalDate = (event.metadata as any)?.startsOnOriginalDate || 
                                 (event as any)?.startsOnOriginalDate;
  if (isSameOriginalDate && shouldShowOnOriginalDate) {
    return true;
  }
  
  // For non-recurring events, just check if dates match
  if (!event.isRecurring) {
    return isSameOriginalDate;
  }

  // For recurring events, check based on recurrence type
  const recurrenceType = (event.metadata as any)?.recurrenceType || (event as any).recurrenceType;
  const interval = (event.metadata as any)?.recurrenceInterval || (event as any).recurrenceInterval || 1;
  
  switch (recurrenceType) {
    case "WEEKLY": {
      const dayOfWeek = targetDate.getDay();
      const eventDayOfWeek = eventStartDate.getDay();
      
      if (dayOfWeek !== eventDayOfWeek) {
        return false;
      }
      
      // Check if target date is at the correct interval
      const daysDiff = Math.floor((targetDate.getTime() - eventStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Allow the event to show on or after the start date
      if (daysDiff < 0) {
        return false;
      }
      
      // For weekly events, check if it falls on the correct interval
      const weeksDiff = Math.floor(daysDiff / 7);
      return weeksDiff % interval === 0;
    }
    
    case "MONTHLY": {
      const targetDay = targetDate.getDate();
      const eventDay = eventStartDate.getDate();
      
      // Check if it's the same day of the month
      if (targetDay !== eventDay) {
        // Handle month-end cases (e.g., Jan 31 -> Feb 28)
        const lastDayOfTargetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
        if (eventDay > lastDayOfTargetMonth && targetDay === lastDayOfTargetMonth) {
          // It's the last day of the month and the event was scheduled for a day that doesn't exist
        } else {
          return false;
        }
      }
      
      // Check if target date is at the correct interval
      const monthsDiff = (targetDate.getFullYear() - eventStartDate.getFullYear()) * 12 + 
                        (targetDate.getMonth() - eventStartDate.getMonth());
      return monthsDiff >= 0 && monthsDiff % interval === 0;
    }
    
    case "YEARLY": {
      const targetMonth = targetDate.getMonth();
      const targetDay = targetDate.getDate();
      const eventMonth = eventStartDate.getMonth();
      const eventDay = eventStartDate.getDate();
      
      if (targetMonth !== eventMonth || targetDay !== eventDay) {
        // Handle leap year edge case for Feb 29
        if (eventMonth === 1 && eventDay === 29 && targetMonth === 1 && targetDay === 28) {
          // Feb 29 event on non-leap year shows on Feb 28
          const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
          if (!isLeapYear(targetDate.getFullYear())) {
            return true;
          }
        }
        return false;
      }
      
      // Check if target date is at the correct interval
      const yearsDiff = targetDate.getFullYear() - eventStartDate.getFullYear();
      return yearsDiff >= 0 && yearsDiff % interval === 0;
    }
    
    default:
      return false;
  }
};

// Update the getEventsForDay function
const getEventsForDay = useCallback(
  (day: number, monthDate: Date) => {
    if (!events?.length) return [];
    
    // Create a reference date for the day we're checking
    const targetDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();
    const weekday = targetDate.getDay();

    return events.filter((event) => {
      try {
        // For bills and assignments with special metadata handling
        if (event.metadata?.type === "bill" || event.metadata?.type === "assignment") {
          // Check if this event should appear on the target date
          if (event.metadata?.dueDate) {
            let eventDate: Date;

            if (typeof event.metadata.dueDate === "string") {
              const dueDateString = event.metadata.dueDate as string;
              const [year, month, day] = (dueDateString
                .slice(0, 10)
                .split("-")
                .map((n: string) => parseInt(n, 10)));
              eventDate = new Date(year, month - 1, day, 0, 0, 0, 0);
            } else {
              const d = new Date(event.metadata.dueDate);
              eventDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            }

            // For recurring bills, use the recurrence logic
            if (event.isRecurring && event.metadata?.type === "bill") {
              return shouldEventAppearOnDate(event, targetDate);
            } else {
              // For non-recurring or assignments, check exact date match
              return (
                eventDate.getFullYear() === targetYear &&
                eventDate.getMonth() === targetMonth &&
                eventDate.getDate() === targetDay
              );
            }
          }
        }

        // For recurring events with recurring days (legacy weekly events)
        if (
          event.isRecurring === true &&
          Array.isArray(event.recurringDays) &&
          event.recurringDays.length > 0
        ) {
          return event.recurringDays.includes(weekday);
        }

        // For other recurring events, use the enhanced logic
        if (event.isRecurring) {
          return shouldEventAppearOnDate(event, targetDate);
        }

        // For regular non-recurring events
        const eventDate = event.startDate instanceof Date
          ? event.startDate
          : new Date(event.startDate);
          
        if (!eventDate || isNaN(eventDate.getTime())) {
          console.warn("Invalid event date:", event);
          return false;
        }

        return (
          eventDate.getFullYear() === targetYear &&
          eventDate.getMonth() === targetMonth &&
          eventDate.getDate() === targetDay
        );
      } catch (error) {
        console.error("Error filtering event:", event, error);
        return false;
      }
    });
  },
  [events]
);

// Add a specific function for week view events
const getEventsForWeekDay = useCallback(
  (date: Date) => {
    if (!events?.length) return [];
    
    const targetYear = date.getFullYear();
    const targetMonth = date.getMonth();
    const targetDay = date.getDate();
    const weekday = date.getDay();

    return events.filter((event) => {
      try {
        // For bills and assignments with special metadata handling
        if (event.metadata?.type === "bill" || event.metadata?.type === "assignment") {
          if (event.metadata?.dueDate) {
            let eventDate: Date;

            if (typeof event.metadata.dueDate === "string") {
              const dueDateString = event.metadata.dueDate as string;
              const [year, month, day] = (dueDateString
                .slice(0, 10)
                .split("-")
                .map((n: string) => parseInt(n, 10)));
              eventDate = new Date(year, month - 1, day, 0, 0, 0, 0);
            } else {
              const d = new Date(event.metadata.dueDate);
              eventDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            }

            // For recurring bills, use the recurrence logic
            if (event.isRecurring && event.metadata?.type === "bill") {
              return shouldEventAppearOnDate(event, date);
            } else {
              // For non-recurring or assignments, check exact date match
              return (
                eventDate.getFullYear() === targetYear &&
                eventDate.getMonth() === targetMonth &&
                eventDate.getDate() === targetDay
              );
            }
          }
        }

        // For recurring events with recurring days (legacy weekly events)
        if (
          event.isRecurring === true &&
          Array.isArray(event.recurringDays) &&
          event.recurringDays.length > 0
        ) {
          return event.recurringDays.includes(weekday);
        }

        // For other recurring events, use the enhanced logic
        if (event.isRecurring) {
          return shouldEventAppearOnDate(event, date);
        }

        // For regular non-recurring events
        const eventDate = event.startDate instanceof Date
          ? event.startDate
          : new Date(event.startDate);
          
        if (!eventDate || isNaN(eventDate.getTime())) {
          console.warn("Invalid event date:", event);
          return false;
        }

        return (
          eventDate.getFullYear() === targetYear &&
          eventDate.getMonth() === targetMonth &&
          eventDate.getDate() === targetDay
        );
      } catch (error) {
        console.error("Error filtering event:", event, error);
        return false;
      }
    });
  },
  [events]
);

// Add the missing getDayName function before the getters object
const getDayName = (dayIndex: number): string => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[dayIndex] || "";
};

// Update the getters object to include the week view function
const getters: Getters = {
  getDaysInMonth,
  getEventsForDay,
  getEventsForWeekDay, // Add this
  getDaysInWeek,
  getWeekNumber,
  getDayName, // This was missing
};

  // Function to handle event styling
  // This function calculates the height and position of the event
  function handleEventStyling(
    event: Event,
    dayEvents: Event[],
    periodOptions?: {
      eventsInSamePeriod?: number;
      periodIndex?: number;
      adjustForPeriod?: boolean;
    }
  ) {
    // use your real row-height
    const ROW_HEIGHT = 56;
  
    let eventHeight = 0;
    let eventTop = 0;
  
    if (event.startDate instanceof Date && event.endDate instanceof Date) {
      const startMinutes =
        event.startDate.getHours() * 60 + event.startDate.getMinutes();
      const endMinutes =
        event.endDate.getHours() * 60 + event.endDate.getMinutes();
      const adjustedEnd = endMinutes < startMinutes ? endMinutes + 1440 : endMinutes;
      const diff = adjustedEnd - startMinutes;
  
      // height & top based on ROW_HEIGHT
      eventHeight = (diff / 60) * ROW_HEIGHT;
      eventTop = (startMinutes / 60) * ROW_HEIGHT;
  
      if (eventHeight < 20) eventHeight = 20;
      const maxHeight = 24 * ROW_HEIGHT - eventTop;
      if (eventHeight > maxHeight) eventHeight = maxHeight;
    }
  
    // Overlap handling with proper width calculation
    const useCustomPeriod =
      periodOptions?.adjustForPeriod &&
      periodOptions.eventsInSamePeriod !== undefined &&
      periodOptions.periodIndex !== undefined;
  
    // Get event count and position for column layout
    let numEventsOnHour = useCustomPeriod ? periodOptions!.eventsInSamePeriod! : 1;
    let indexOnHour = useCustomPeriod ? periodOptions!.periodIndex! : 0;
  
    // If custom period indexing fails, fallback to default
    if (numEventsOnHour === 0 || indexOnHour === -1) {
      numEventsOnHour = 1;
      indexOnHour = 0;
    }
  
    // Calculate width and position with spacing
    const widthPercentage = 90 / Math.max(numEventsOnHour, 1);
    const leftPosition = indexOnHour * widthPercentage;
    const safeLeftPosition = Math.min(leftPosition, 100 - widthPercentage);
  
    return {
      height: `${eventHeight}px`,
      top: `${eventTop}px`,
      left: `${safeLeftPosition}%`,
      maxWidth: `${widthPercentage}%`,
      minWidth: `${widthPercentage}%`,
      zIndex: indexOnHour + 1,
    };
  }

  function handleAddEvent(event: Event) {
    dispatch({ type: "ADD_EVENT", payload: event });
    if (onAddEvent) {
      onAddEvent(event);
    }
  }

  function handleUpdateEvent(event: Event, id: string) {
    // Update UI immediately for responsiveness
    dispatch({ 
      type: "UPDATE_EVENT", 
      payload: { 
        ...event,
        id // Ensure the ID is preserved
      } 
    });
    
    // Call any external update handler
    if (onUpdateEvent) {
      onUpdateEvent(event);
    }
  }

  function handleDeleteEvent(id: string) {
    try {
      console.log("Deleting event from provider:", id);
      
      // Update UI immediately for responsiveness
      dispatch({ type: "REMOVE_EVENT", payload: { id } });
      
      // Call any external delete handler
      if (onDeleteEvent) {
        onDeleteEvent(id);
      }
      
      return true;
    } catch (error) {
      console.error("Error in provider's handleDeleteEvent:", error);
      return false;
    }
  }

  // Update the openEditModal function
  function openEditModal(event: Event) {
    if (modalContext && modalContext.setOpen) {
      modalContext.setOpen(
        <CustomModal title="Edit Event">
          <AddEventModal />
        </CustomModal>,
        async () => ({ default: event })
      );
    } else {
      console.error("Modal context not available");
    }
  }

  // Add refreshEvents to the handlers object if not already there
  const handlers: Handlers = {
    handleEventStyling,
    handleAddEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    openEditModal,
    refreshEvents, // Make sure this is included
  };

  useEffect(() => {
    // Function to handle calendar refresh events
    const handleCalendarRefresh = async () => {
      await refreshEvents();
    };

    // Add event listener for the custom refresh event
    window.addEventListener('calendar-refresh-needed', handleCalendarRefresh);

    // Clean up the event listener on unmount
    return () => {
      window.removeEventListener('calendar-refresh-needed', handleCalendarRefresh);
    };
  }, []);

  return (
    <SchedulerContext.Provider
      value={{
        events: state,
        dispatch,
        getters,
        handlers,
        weekStartsOn,
        refreshEvents, // Add this to expose the function to consumers
      }}
    >
      <ModalProvider>{children}</ModalProvider>
    </SchedulerContext.Provider>
  );
};

// Custom hook to use the scheduler context
export const useScheduler = () => {
  const context = useContext(SchedulerContext);
  if (!context) {
    throw new Error("useScheduler must be used within a SchedulerProvider");
  }
  return context;
};

