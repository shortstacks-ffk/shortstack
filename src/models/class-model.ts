import { v4 as uuidv4 } from "uuid"; 

export interface Class {
  id: string;
  name: string;
  frequency: "daily" | "weekly";
  studentCount: number;
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  time: string; // hh:mm format
  grade: string; // 1st, 2nd, 3rd, etc.
}

export class ClassModel {
  private classes: Class[] = [];

  getClasses(): Class[] {
    return this.classes;
  }

  addClass(classData: Omit<Class, "id">): Class {
    // Validate data before adding
    if (!this.isValidTime(classData.time)) {
      throw new Error("Invalid time format. Expected hh:mm.");
    }

    if (!this.isValidGrade(classData.grade)) {
      throw new Error("Invalid grade format. Expected format like 1st, 2nd, 3rd, etc.");
    }

    const newClass: Class = {
      id: uuidv4(), // Generate a unique ID
      ...classData,
    };

    this.classes.push(newClass);
    return newClass;
  }

  private isValidTime(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    return timeRegex.test(time);
  }

  private isValidGrade(grade: string): boolean {
    const gradeRegex = /^\d+(st|nd|rd|th)$/;
    return gradeRegex.test(grade);
  }
}
