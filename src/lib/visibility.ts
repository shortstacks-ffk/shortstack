import { ClassContentVisibility } from '@prisma/client';

// Make sure the visibility logic accounts for scheduled dates
export function isContentVisibleToStudents(visibilitySettings?: ClassContentVisibility | null): boolean {
  if (!visibilitySettings) {
    // If no settings found, default to hidden
    return false;
  }
  
  // Not visible if explicitly marked as not visible
  if (!visibilitySettings.visibleToStudents) {
    return false;
  }
  
  // Check scheduled visibility date
  if (visibilitySettings.visibilityStartDate) {
    const now = new Date();
    const visibilityStartDate = new Date(visibilitySettings.visibilityStartDate);
    
    // Not visible if the start date is in the future
    if (visibilityStartDate > now) {
      return false;
    }
  }
  
  // If we passed all checks, content is visible
  return true;
}