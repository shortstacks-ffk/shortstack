import { addDays, addWeeks, addMonths, setDate } from "date-fns";

// Function to get recurrence days based on cadence
export function getSessionDates(
  startDate: Date,
  endDate: Date | null,
  cadence: string,
  dayOfWeek: number,
  limit = 52 // Limit to prevent infinite recurring events
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);

  // Set currentDate to the correct day of week if needed
  if (currentDate.getDay() !== dayOfWeek) {
    // Find the next occurrence of the specified day of week
    const daysToAdd = (7 + dayOfWeek - currentDate.getDay()) % 7;
    currentDate = addDays(currentDate, daysToAdd);
  }

  let count = 0;
  // End date + 1 day to include the end date
  const finalEndDate = endDate ? new Date(endDate.getTime() + 86400000) : null;

  while ((!finalEndDate || currentDate < finalEndDate) && count < limit) {
    dates.push(new Date(currentDate));
    count++;

    // Adjust the increment based on the cadence
    switch (cadence.toLowerCase()) {
      case "daily":
        currentDate = addDays(currentDate, 1);
        break;
      case "weekly":
        currentDate = addWeeks(currentDate, 1);
        break;
      case "biweekly":
        currentDate = addWeeks(currentDate, 2);
        break;
      case "monthly":
        currentDate = addMonths(currentDate, 1);
        break;
      case "quarterly":
        currentDate = addMonths(currentDate, 3);
        break;
      default:
        // Default to weekly if cadence is unknown
        currentDate = addWeeks(currentDate, 1);
    }
  }

  return dates;
}

// Helper to create calendar events from class sessions
export function createCalendarEventsFromClassSessions(
  classData: {
    id: string;
    name: string;
    emoji: string;
    code: string;
    color?: string;
    cadence?: string;
    grade?: string;
    startDate?: Date;
    endDate?: Date;
    classSessions?: { dayOfWeek: number; startTime: string; endTime: string; }[];
  },
  teacherId: string
) {
  const events = [];
  
  if (!classData.classSessions?.length || !classData.startDate) {
    return [];
  }
  
  const cadence = classData.cadence || "weekly"; // Default to weekly if not specified
  
  // Process each class session
  for (const session of classData.classSessions) {
    const { dayOfWeek, startTime, endTime } = session;
    
    // Get all dates for this session based on cadence
    const sessionDates = getSessionDates(
      classData.startDate,
      classData.endDate || null,
      cadence,
      dayOfWeek
    );
    
    // For each date, create a calendar event
    for (const date of sessionDates) {
      // Parse the time strings
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      // Create start and end datetime objects
      const startDateTime = new Date(date);
      startDateTime.setHours(startHour, startMinute, 0);
      
      const endDateTime = new Date(date);
      endDateTime.setHours(endHour, endMinute, 0);
      
      events.push({
        title: classData.name,
        description: `${classData.emoji} ${classData.name} (${classData.code})`,
        startDate: startDateTime,
        endDate: endDateTime,
        variant: classData.color || "primary",
        isRecurring: false, // Each event is a separate occurrence
        createdById: teacherId,
        classId: classData.id,
        metadata: {
          type: "class",
          classId: classData.id,
          className: classData.name,
          classEmoji: classData.emoji,
          classColor: classData.color
        }
      });
    }
  }
  
  return events;
}

export interface ClassWithStats {
  id: string;
  name: string;
  emoji: string;
  code: string;
  color?: string;
  cadence?: string;
  grade?: string;
  startDate?: Date;
  endDate?: Date;
  classSessions?: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
  }[];
  _count?: {
    enrollments: number;
  };
  numberOfStudents: number;
}