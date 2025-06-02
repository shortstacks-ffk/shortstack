import { format, toZonedTime} from 'date-fns-tz';

/**
 * Gets the user's local time zone
 */
export function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Formats a date to UTC ISO string while preserving the local time
 * This helps with "time zone shifting" issues when storing dates
 */
export function formatLocalTimeToUTC(date: Date, timeZone: string): string {
  // Just convert the date to ISO string since we'll interpret it correctly later
  return date.toISOString();
}

/**
 * Converts a UTC ISO string back to a local date object
 */
export function formatUTCToLocalTime(utcString: string, timeZone: string): Date {
  const date = new Date(utcString);
  return toZonedTime(date, timeZone);
}

/**
 * Formats a time string (HH:MM) for display in 12-hour format
 */
export function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}