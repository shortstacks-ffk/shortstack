'use server';

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import * as bcrypt from 'bcryptjs';
import { sendStudentInvitation } from "@/src/lib/email";


interface StudentData {
  firstName: string;
  lastName: string;
  schoolEmail: string;
  password?: string;
}

interface StudentResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Get all students in a class
export async function getStudentsByClass(classCode: string): Promise<StudentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const students = await db.student.findMany({
      where: { classId: classCode },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolEmail: true,
        progress: true
      },
      orderBy: { firstName: 'asc' }
    });

    return { success: true, data: students };
  } catch (error) {
    console.error("Get students error:", error);
    return { success: false, error: "Failed to fetch students" };
  }
}

// Get single student by username in a class
export async function getStudentByUsername(
  classCode: string, 
  username: string
): Promise<StudentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const student = await db.student.findFirst({
      where: { 
        classId: classCode,
        schoolEmail: schoolEmail
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolEmail: true,
        progress: true
      }
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    return { success: true, data: student };
  } catch (error) {
    console.error("Get student error:", error);
    return { success: false, error: "Failed to fetch student" };
  }
}


// Create student
export async function createStudent(formData: FormData, classCode: string): Promise<StudentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (!classCode) {
      return { success: false, error: "Class code is required" };
    }

    // Check class capacity first
    const classData = await db.class.findFirst({
      where: { code: classCode },
      include: { students: true }
    });

    if (!classData) {
      return { success: false, error: "Class not found" };
    }

    // Extract and validate fields
    const firstName = formData.get('firstName')?.toString().trim() || "";
    const lastName = formData.get('lastName')?.toString().trim() || "";
    const schoolEmail = formData.get('schoolEmail')?.toString().trim() || "";
    const password = formData.get('password')?.toString().trim() || "";

    if (!firstName || !lastName || !schoolEmail || !password) {
      return { success: false, error: "All required fields must be filled out" };
    }

    // Check if a student with this email already exists
    const existingStudent = await db.student.findUnique({
      where: { schoolEmail }
    });
    if (existingStudent) {
      return { success: false, error: "A student with this email already exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Creating student with data:', {
      firstName,
      lastName,
      schoolEmail,
      classId: classCode
    });

    const student = await db.student.create({
      data: {
        firstName,
        lastName,
        schoolEmail,
        password: hashedPassword,
        classId: classCode,
        progress: 0
      }
    });

    console.log('Student created:', student);

    revalidatePath(`/dashboard/classes/${classCode}`);

    // Send invitation email
    await sendStudentInvitation({
      to: schoolEmail,
      subject: `Welcome to your class, ${firstName}!`,
      text: `Hi ${firstName},\n\nYou have been added to the class ${classData.name}.\nYour login credentials are:\nEmail: ${schoolEmail}\nPassword: ${password}\n\nPlease go to the student login page and use these credentials to sign in.\n\nThank you!`
    });

    return { success: true, data: student };
  } catch (error: any) {
    console.error("Create student error:", error.message || error);
    return { success: false, error: error.message || "Failed to create student" };
  }
}
export async function updateStudent(
  formData: FormData, 
  classCode: string, 
  studentId: string
): Promise<StudentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const data = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      schoolEmail: formData.get('schoolEmail') as string,
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    };

    const updateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      schoolEmail: data.schoolEmail,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const student = await db.student.update({
      where: { id: studentId },
      data: updateData
    });

    revalidatePath(`/dashboard/classes/${classCode}`);
    return { success: true, data: student };
  } catch (error) {
    console.error("Update student error:", error);
    return { success: false, error: "Failed to update student" };
  }
}

// Delete student
export async function deleteStudent(
  classCode: string,
  studentId: string
): Promise<StudentResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    await db.student.delete({
      where: { id: studentId }
    });

    revalidatePath(`/dashboard/classes/${classCode}`);
    return { success: true };
  } catch (error) {
    console.error("Delete student error:", error);
    return { success: false, error: "Failed to delete student" };
  }
}





// Function for students to join a class
// This function comes after the student has logged in with the credentials provided by the teacher via email
// The student can then join a class using the class code provided by the teacher
// The class code is unique to each class and is used to identify the class the student wants to join
// The student must be authenticated to join a class
// The student can join a class in the student dashboard within the classes section
// The student must enter the class code in the input field and click the join button
interface JoinClassResponse {
  success: boolean;
  error?: string;
  data?: any;
}

export async function joinClass(classCode: string): Promise<JoinClassResponse> {
  try {
    // Get the currently authenticated student (assuming students are authenticated via Clerk)
    const studentUser = await auth();
    if (!studentUser?.userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Lookup the class using the provided class code
    const classData = await db.class.findUnique({
      where: { code: classCode },
      include: { students: true }
    });

    if (!classData) {
      return { success: false, error: "Invalid class code" };
    }

    // Check if the student is already assigned (modify as needed if a student can join multiple classes)
    const student = await db.student.findUnique({
      where: { schoolEmail: studentUser.schoolEmail }
    });

    if (!student) {
      return { success: false, error: "Student record not found" };
    }

    // If you want to prevent rejoining the same class:
    if (student.classId === classCode) {
      return { success: false, error: "You have already joined this class" };
    }

    // For simplicity, update the student's classId. (If you have many-to-many relationship, use a join table instead.)
    const updatedStudent = await db.student.update({
      where: { id: student.id },
      data: { classId: classCode }
    });

    // Revalidate to update any ISR caches
    revalidatePath('student/dashboard/classes');

    return { success: true, data: updatedStudent };
  } catch (error: any) {
    console.error("joinClass error:", error);
    return { success: false, error: error.message || "Failed to join class" };
  }
}