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

const getEventsForDay = useCallback(
  (day: number, monthDate: Date) => {
    if (!events?.length) return [];
    
    // Create a reference date for the day we're checking
    const targetDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();
    const weekday = targetDate.getDay();
    
    // Debug the target date we're filtering for
    console.log(`Filtering events for date: ${targetYear}-${targetMonth+1}-${targetDay} (weekday: ${weekday})`);

    return events.filter((event) => {
      // For recurring events with recurring days, check if the weekday matches
      if (
        event.isRecurring === true &&
        Array.isArray(event.recurringDays) &&
        event.recurringDays.length > 0
      ) {
        const matches = event.recurringDays.includes(weekday);
        if (matches) {
          console.log(`Recurring event match: ${event.title} appears on weekday ${weekday}`);
        }
        return matches;
      }
      
      // Special handling for bills and assignments
      if (
        event.metadata?.type === "bill" ||
        event.metadata?.type === "assignment"
      ) {
        let eventDate: Date;

        if (typeof event.metadata?.dueDate === "string") {
          // "2025-05-09T00:00:00.000Z" → ["2025","05","09"] → local midnight
          const [year, month, day] = (event.metadata.dueDate as string)
            .slice(0, 10)
            .split("-")
            .map((n) => parseInt(n, 10));
          eventDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else {
          // fallback if someone stored a Date in metadata
          const d = event.metadata.dueDate as unknown as Date;
          eventDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }

        const matches =
          eventDate.getFullYear() === targetYear &&
          eventDate.getMonth() === targetMonth &&
          eventDate.getDate() === targetDay;

        if (matches) {
          console.log(
            `Bill/Assignment match: ${event.title} on ${targetYear}-${
              targetMonth + 1
            }-${targetDay}`
          );
        }
        return matches;
      }
      
      // For all other regular events
      const eventDate = event.startDate instanceof Date
        ? event.startDate
        : new Date(event.startDate);
        
      const eventYear = eventDate.getFullYear();
      const eventMonth = eventDate.getMonth();
      const eventDay = eventDate.getDate();
      
      const matches = (
        eventYear === targetYear &&
        eventMonth === targetMonth &&
        eventDay === targetDay
      );
      
      if (matches) {
        console.log(`Regular event match: ${event.title} on ${eventYear}-${eventMonth+1}-${eventDay}`);
      }
      
      return matches;
    });
  },
  [events]
);

  const getDayName = (day: number) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[day];
  };

  const getters: Getters = {
    getDaysInMonth,
    getEventsForDay,
    getDaysInWeek,
    getWeekNumber,
    getDayName,
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

