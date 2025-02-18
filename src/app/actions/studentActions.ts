'use server';

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import * as bcrypt from 'bcryptjs';


interface StudentData {
  firstName: string;
  lastName: string;
  schoolName: string;
  username: string;
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
        username: true,
        schoolName: true,
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
        username: username
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        schoolName: true,
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
      include: { 
        students: true 
      }
    });

    if (!classData) {
      return { success: false, error: "Class not found" };
    }

    // Log form data and class code for debugging
    const formEntries = Array.from(formData.entries());
    console.log('FormData received:', formEntries);
    console.log('ClassCode received:', classCode);

    // Validate class code
    if (!classCode || typeof classCode !== 'string') {
      console.error('Invalid classCode:', classCode);
      return { success: false, error: "Invalid class code" };
    }

    // Extract and validate fields
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const schoolName = formData.get('schoolName') as string;
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    // Check for presence and non-empty values
    if (!firstName?.trim() || !lastName?.trim() || !username?.trim() || !password?.trim()) {
      console.error('Missing or empty required fields:', { firstName, lastName, username, password });
      return { success: false, error: "All required fields must be filled out" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    // const student = await db.student.create({
    //   data: {
    //     firstName: firstName.trim(),
    //     lastName: lastName.trim(),
    //     schoolName: schoolName?.trim() || '',
    //     username: username.trim(),
    //     password: hashedPassword,
    //     classId: classCode,
    //     progress: 0
    //   }
    // });

    console.log('Creating student with data:', {
      firstName,
      lastName,
      schoolName,
      username,
      classId: classCode
    });

    const student = await db.student.create({
      data: {
        firstName,
        lastName,
        schoolName,
        username,
        password: hashedPassword,
        classId: classCode,
        progress: 0
      }
    });

    console.log('Student created:', student);

    revalidatePath(`/dashboard/classes/${classCode}`);
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
      schoolName: formData.get('schoolName') as string,
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    };

    const updateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      schoolName: data.schoolName,
      username: data.username,
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


// See text.txt