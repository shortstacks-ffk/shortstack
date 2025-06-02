/**
 * Date utility functions to ensure consistent date handling throughout the app
 */

/**
 * Creates a normalized date with the time set to midnight in local timezone
 */
export function normalizeDate(date: Date | string): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

/**
 * Creates a date with specific time in local timezone
 */
export function createDateWithTime(date: Date | string, hours: number, minutes: number): Date {
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

/**
 * Formats a date into YYYY-MM-DD format for input elements
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a time into HH:MM format for input elements
 */
export function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Ensures date objects are properly created without timezone issues
 */
export function safeDateParse(dateStr: string): Date {
  // Split the date string into components
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date object with local timezone consideration
  return new Date(year, month - 1, day);
}

/**
 * Creates a date from YYYY-MM-DD string for calendar display
 * This ensures the date is displayed on the correct day regardless of timezone
 */
export function createCalendarDisplayDate(dateStr: string | Date): Date {
  // If it's already a Date object, extract the components
  if (dateStr instanceof Date) {
    return new Date(
      dateStr.getFullYear(),
      dateStr.getMonth(),
      dateStr.getDate(),
      12, 0, 0
    );
  }
  
  // If it's a string, check the format
  if (typeof dateStr === 'string') {
    // If it has a 'T', it's likely an ISO date string
    if (dateStr.includes('T')) {
      const datePart = dateStr.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0);
    }
    
    // If it's just a date (YYYY-MM-DD)
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0);
    }
  }
  
  // Fallback: create a date and set to noon
  const date = new Date(dateStr);
  date.setHours(12, 0, 0, 0);
  return date;
}

// Add the formatClassSchedule function for consistent display
const DaysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Add a helper function to format time in 12-hour format
function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Update the formatClassSchedule function
export function formatClassSchedule(sessions?: any[]) {
  if (!sessions || sessions.length === 0) return null;
  
  return sessions.map(session => {
    const day = DaysOfWeek[session.dayOfWeek];
    const startTime = formatTime(session.startTime);
    const endTime = formatTime(session.endTime);
    return `${day} ${startTime}-${endTime}`;
  }).join(', ');
}