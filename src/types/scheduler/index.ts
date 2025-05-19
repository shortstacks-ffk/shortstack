import { Dispatch, SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

// Define event type
export interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  variant?: string;
  isRecurring?: boolean;
  recurringDays?: number[];
  minmized?: boolean;
  metadata?: {
    type?: string;
    billId?: string;
    assignmentId?: string;
    classId?: string;
    todoId?: string;
    studentId?: string;
    classColor?: string;
    dueDate?: Date;
    isAllDay?: boolean;
    originalDueDate?: Date;
  };
}

export interface EventStyledProps extends Event {
  minmized?: boolean;
}

// Define the state interface for the scheduler
export interface SchedulerState {
  events: Event[];
}

// Define actions for reducer
export type Action =
  | { type: "ADD_EVENT"; payload: Event }
  | { type: "REMOVE_EVENT"; payload: { id: string } }
  | { type: "UPDATE_EVENT"; payload: Event }
  | { type: "SET_EVENTS"; payload: Event[] };

// Define handlers interface
export interface Handlers {
  handleAddEvent: (event: Event) => void;
  handleUpdateEvent: (event: Event, id: string) => void;
  handleDeleteEvent: (id: string) => void;
  handleEventStyling: (
    event: Event,
    dayEvents: Event[],
    periodOptions?: {
      eventsInSamePeriod?: number;
      periodIndex?: number;
      adjustForPeriod?: boolean;
    }
  ) => Record<string, any>;
  openEditModal: (event: Event) => void;
}

// Define getters interface
export interface Getters {
  getDaysInMonth: (
    month: number,
    year: number
  ) => { day: number; events: Event[] }[];
  getEventsForDay: (day: number, currentDate: Date) => Event[];
  getDaysInWeek: (week: number, year: number) => Date[];
  getWeekNumber: (date: Date) => number;
  getDayName: (day: number) => string;
  events?: Event[];
}

// Define the context value interface
export interface SchedulerContextType {
  events: SchedulerState;
  dispatch: Dispatch<Action>;
  getters: Getters;
  handlers: Handlers;
  weekStartsOn: startOfWeek;
  refreshEvents: () => Promise<void>;
}

// Define the variant options
export const variants = [
  "success",
  "primary",
  "default",
  "warning",
  "danger",
] as const;

export type Variant = (typeof variants)[number];

// Define Zod schema for form validation
export interface EventFormData {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  variant: string;
  color?: string;
}

export type Views = {
  mobileViews?: string[];
  views?: string[];
  defaultView?: string;
};

export type startOfWeek = "sunday" | "monday";

export interface CustomEventModal {
  CustomAddEventModal?: {
    title?: string;
    CustomForm?: React.FC<{ register: any; errors: any }>;
  };
  CustomViewEventModal?: {
    component?: React.FC<{ event: Event; onClose: () => void }>;
  };
}

export interface CustomComponents {
  customButtons?: {
    CustomAddEventButton?: React.ReactNode;
    CustomPrevButton?: React.ReactNode;
    CustomNextButton?: React.ReactNode;
  };
  customTabs?: {
    CustomDayTab?: React.ReactNode;
    CustomWeekTab?: React.ReactNode;
    CustomMonthTab?: React.ReactNode;
  };
  CustomEventComponent?: React.FC<Event>;
  CustomEventModal?: CustomEventModal;
}

export interface ButtonClassNames {
  prev?: string;
  next?: string;
  addEvent?: string;
}

export interface TabClassNames {
  view?: string;
}

export interface TabsClassNames {
  cursor?: string;
  panel?: string;
  tab?: string;
  tabContent?: string;
  tabList?: string;
  wrapper?: string;
}

export interface ViewClassNames {
  dayView?: string;
  weekView?: string;
  monthView?: string;
}

export interface ClassNames {
  event?: string;
  buttons?: ButtonClassNames;
  tabs?: TabsClassNames;
  views?: ViewClassNames;
  calendar?: {
    todayCell?: string;
    container?: string;
  };
}
