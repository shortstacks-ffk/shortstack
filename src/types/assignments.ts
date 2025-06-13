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
}