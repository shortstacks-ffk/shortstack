export interface AssignmentRecord {
  id: string;
  name: string;
  fileType?: string;
  activity?: string;
  createdAt?: string;
  dueDate?: string;
  size?: string | number;
  file?: File;
  url?: string;
  textAssignment?: string;
  description?: string;
  classId?: string; // Add this if it's missing
  lessonPlans?: Array<{ id: string; name: string; }>;
  lessonPlanIds?: string[];
  genericLessonPlanId?: string; // For generic assignments
  isGeneric?: boolean; // Flag to indicate if this is a generic assignment
  GenericLessonPlan?: {
    id: string;
    name: string;
  } | null; // Nullable to handle cases where it's not a generic assignment
  GenericLessonPlanId?: string; // For generic assignments
  GenericLessonPlanName?: string; // For generic assignments
  GenericLessonPlanClasses?: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  GenericLessonPlanClassIds?: string[]; // For generic assignments
  visibleToStudents?: boolean;
  scheduledVisibility?: string | null; // Nullable to handle cases where visibility is not scheduled
}