export interface FileRecord {
  id: string;
  name: string;
  fileType?: string;
  activity?: string;
  createdAt?: string;
  size?: string | number;
  url?: string;
  lessonPlanIds?: string[];
  classId?: string;
  
  // Add these optional properties to handle various response formats
  fileId?: string;        // Alternative ID field from upload responses
  fileName?: string;      // Alternative name field from upload responses
  fileUrl?: string;       // Alternative URL field from upload responses
}