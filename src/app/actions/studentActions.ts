'use server';

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import * as bcrypt from 'bcryptjs';
import { sendStudentInvitation } from "@/src/lib/email";

// Utility function to generate random passwords
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Get all students in a class with enrollment counts
export async function getStudentsByClass(classCode: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    // Find the class by code
    const classData = await db.class.findUnique({ where: { code: classCode } });
    if (!classData) return { success: false, error: "Class not found" };

    console.log("Class data:", classData);

    // Get students enrolled in the class
    const enrollments = await db.enrollment.findMany({
      where: { classId: classData.id },
      include: { student: true }
    });

    // Transform the data for the UI
    const students = enrollments.map(enrollment => ({
      id: enrollment.student.id,
      firstName: enrollment.student.firstName,
      lastName: enrollment.student.lastName,
      schoolEmail: enrollment.student.schoolEmail,
      progress: enrollment.student.progress,
      enrolled: enrollment.enrolled
    }));


    // Calculate enrollment stats
    const enrollmentStats = {
      total: enrollments.length,
      enrolled: enrollments.filter(e => e.enrolled).length
    };

    return {
      success: true,
      data: {
        students,
        enrollmentStats
      }
    };
  } catch (error) {
    console.error("Get students error:", error);
    return { success: false, error: "Failed to fetch students" };
  }
}

// Create a new student and enroll them in a class
export async function createStudent(formData: FormData, classCode: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    // Find the class by code
    const classData = await db.class.findUnique({ where: { code: classCode } });
    if (!classData) return { success: false, error: "Class not found" };

    // Extract and validate fields
    const firstName = formData.get('firstName')?.toString().trim() || "";
    const lastName = formData.get('lastName')?.toString().trim() || "";
    const schoolEmail = formData.get('schoolEmail')?.toString().trim() || "";
    const password = formData.get('password')?.toString().trim() || "";
    const generatePasswordValue = formData.get('generatePassword');
    const generateTemporaryPassword = generatePasswordValue === 'true';

    if (!firstName || !lastName || !schoolEmail) {
      return { success: false, error: "Missing required fields" };
    }

    // Check if the student already exists
    let student = await db.student.findUnique({ where: { schoolEmail } });
    
    // If student exists, check if they're already in this class
    if (student) {
      const existingEnrollment = await db.enrollment.findUnique({
        where: { 
          studentId_classId: { 
            studentId: student.id, 
            classId: classData.id 
          } 
        }
      });
      
      if (existingEnrollment) {
        return { success: false, error: "Student already enrolled in this class" };
      }
    }
    
    let finalPassword = password;
    if (generateTemporaryPassword) {
      finalPassword = generateRandomPassword();
    } else if (!password && !student) {
      return { success: false, error: "Password is required for new students" };
    }

    // If student doesn't exist, create them
    if (!student) {
      const hashedPassword = await bcrypt.hash(finalPassword, 10);
      student = await db.student.create({
        data: {
          firstName,
          lastName,
          schoolEmail,
          password: hashedPassword,
          progress: 0,
          class: {
            connect: { id: classData.id }
          }
        }
      });
    }

    // Now create the enrollment
    const enrollment = await db.enrollment.create({
      data: {
        studentId: student.id,
        classId: classData.id,
        enrolled: false  // Not fully enrolled until the student logs in and joins
      }
    });

    // Send invitation email with appropriate message based on whether student is new or existing
    const isNewStudent = student.createdAt > new Date(Date.now() - 5000); // Created within last 5 seconds
    try {
      await sendStudentInvitation({
        to: schoolEmail,
        subject: `Your Class Invitation for ${classData.name}`,
        text: isNewStudent 
          ? `Hello ${firstName} ${lastName},

You have been added to ${classData.name} by your teacher.
Use the following credentials to log in:

Email: ${schoolEmail}
Password: ${finalPassword}
Class Code: ${classCode}

Please log in and join the class using the provided code.`
          : `Hello ${firstName} ${lastName},

You have been added to a new class: ${classData.name}.
Use your existing login credentials to access the class.

Class Code: ${classCode}

Please log in and join the class using the provided code.`
      });
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Continue with enrollment even if email fails
      // But return a warning to the UI
      revalidatePath(`/dashboard/classes/${classCode}`);
      return { 
        success: true, 
        data: { student, enrollment },
        warning: "Student was added but the invitation email couldn't be sent. Please provide login details manually."
      };
    }

    revalidatePath(`/dashboard/classes/${classCode}`);
    return { success: true, data: { student, enrollment } };

  } catch (error: any) {
    console.error("Create student error:", error);
    return { success: false, error: error.message || "Failed to create student" };
  }
}

// Add an existing student to a class
export async function addExistingStudentToClass(studentId: string, classCode: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    // Find the class by code
    const classData = await db.class.findUnique({ where: { code: classCode } });
    if (!classData) return { success: false, error: "Class not found" };

    // Check that the student exists
    const student = await db.student.findUnique({ where: { id: studentId } });
    if (!student) return { success: false, error: "Student not found" };

    // Prevent duplicate enrollment - important check
    const existingEnrollment = await db.enrollment.findUnique({
      where: { 
        studentId_classId: { 
          studentId: student.id, 
          classId: classData.id 
        } 
      }
    });
    
    if (existingEnrollment) {
      return { success: false, error: "Student already enrolled in this class" };
    }

    // Create the enrollment
    const enrollment = await db.enrollment.create({
      data: {
        studentId: student.id,
        classId: classData.id,
        enrolled: false
      }
    });

    // Send notification email to the student
    try {
      await sendStudentInvitation({
        to: student.schoolEmail,
        subject: `You've Been Added to ${classData.name}`,
        text: `Hello ${student.firstName} ${student.lastName},

You have been added to a new class: ${classData.name}.
Use your existing login credentials to access the class.

Class Code: ${classCode}

Please log in and join the class using the provided code.`
      });
    } catch (emailError) {
      console.error("Failed to send class addition email:", emailError);
      // Continue even if email fails
      // Return warning in response
      revalidatePath(`/dashboard/classes/${classCode}`);
      return { 
        success: true, 
        data: enrollment,
        warning: "Student was added but the notification email couldn't be sent. Please notify them manually."
      };
    }

    revalidatePath(`/dashboard/classes/${classCode}`);
    return { success: true, data: enrollment };

  } catch (error: any) {
    console.error("Add existing student error:", error);
    return { success: false, error: "Failed to add student to class" };
  }
}

// Get all available students not yet enrolled in the specified class
export async function getAvailableStudents(classCode: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const classData = await db.class.findUnique({ where: { code: classCode } });
    if (!classData) return { success: false, error: "Class not found" };

    // Get the IDs of students already enrolled in the class
    const enrolledStudentIds = await db.enrollment.findMany({
      where: { classId: classData.id },
      select: { studentId: true }
    }).then(enrollments => enrollments.map(e => e.studentId));

    // Return students not in the list of enrolled IDs
    const students = await db.student.findMany({
      where: {
        id: { notIn: enrolledStudentIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolEmail: true
      },
      orderBy: { firstName: 'asc' }
    });

    return { success: true, data: students };

  } catch (error) {
    console.error("Get available students error:", error);
    return { success: false, error: "Failed to fetch available students" };
  }
}

// Student joining a class: update the enrollment record to mark as enrolled
export async function joinClass(classCode: string, studentId: string) {
  try {
    // Find the class by code
    const classData = await db.class.findUnique({ where: { code: classCode } });
    if (!classData) return { success: false, error: "Invalid class code" };

    // Find the enrollment
    let enrollment = await db.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId,
          classId: classData.id
        }
      }
    });

    if (!enrollment) {
      // Create new enrollment if it doesn't exist
      enrollment = await db.enrollment.create({
        data: {
          studentId,
          classId: classData.id,
          enrolled: true
        }
      });
    } else if (!enrollment.enrolled) {
      // Update enrollment to enrolled
      enrollment = await db.enrollment.update({
        where: { id: enrollment.id },
        data: { enrolled: true }
      });
    }

    return { 
      success: true, 
      data: {
        className: classData.name,
        emoji: classData.emoji,
        enrolled: true
      }
    };
  } catch (error) {
    console.error("Join class error:", error);
    return { success: false, error: "Failed to join class" };
  }
}

// Update student data
export async function updateStudent(formData: FormData, classCode: string, studentId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    // Find the class by code
    const classData = await db.class.findUnique({ where: { code: classCode } });
    if (!classData) return { success: false, error: "Class not found" };

    // Extract fields from form data
    const firstName = formData.get('firstName')?.toString().trim();
    const lastName = formData.get('lastName')?.toString().trim();
    const schoolEmail = formData.get('schoolEmail')?.toString().trim();
    
    // Validate fields
    if (!firstName || !lastName || !schoolEmail) {
      return { success: false, error: "Missing required fields" };
    }
    
    // Check if email is already taken by another student
    const existingStudent = await db.student.findFirst({
      where: {
        schoolEmail,
        NOT: { id: studentId }
      }
    });
    
    if (existingStudent) {
      return { success: false, error: "Email is already in use by another student" };
    }
    
    // Update the student
    const updatedStudent = await db.student.update({
      where: { id: studentId },
      data: {
        firstName,
        lastName,
        schoolEmail,
      }
    });
    
    revalidatePath(`/dashboard/classes/${classCode}`);
    return { success: true, data: updatedStudent };
  } catch (error) {
    console.error("Update student error:", error);
    return { success: false, error: "Failed to update student" };
  }
}

// Delete a student with options to remove from class or delete completely
// Completely rewrite the deleteStudent function:

export async function deleteStudent(
  classCode: string, 
  studentId: string, 
  options: { removeFromClassOnly: boolean } = { removeFromClassOnly: true }
) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    // Find the class by code
    const classData = await db.class.findUnique({ where: { code: classCode } });
    if (!classData) return { success: false, error: "Class not found" };

    // Find the enrollment to delete
    const enrollment = await db.enrollment.findFirst({
      where: { 
        studentId: studentId,
        classId: classData.id
      }
    });

    if (!enrollment) {
      return { success: false, error: "Student not enrolled in this class" };
    }

    // Step 1: Remove the enrollment (remove from class) - this always happens
    try {
      await db.enrollment.delete({
        where: { id: enrollment.id }
      });
    } catch (enrollmentDeleteError) {
      console.error("Failed to delete enrollment:", enrollmentDeleteError);
      return { success: false, error: "Failed to remove student from class" };
    }
    
    // Step 2: If requested, try to delete the entire student record
    if (!options.removeFromClassOnly) {
      try {
        // Check if this student has the same email as a teacher (potential conflict)
        const student = await db.student.findUnique({
          where: { id: studentId },
          select: { schoolEmail: true }
        });
        
        if (student) {
          const teacherWithSameEmail = await db.user.findUnique({
            where: { email: student.schoolEmail }
          });
          
          if (teacherWithSameEmail) {
            return { 
              success: true, 
              message: "Student removed from class but couldn't be completely deleted because the email is used by a teacher account",
              warning: true
            };
          }
        }
        
        // Check for other enrollments
        const otherEnrollments = await db.enrollment.count({
          where: {
            studentId: studentId
          }
        });
        
        if (otherEnrollments > 0) {
          console.log(`Student has ${otherEnrollments} other enrollments. Proceeding with deletion anyway.`);
        }
        
        // Now try to delete the student
        await db.student.delete({
          where: { id: studentId }
        });
        
        revalidatePath(`/dashboard/classes/${classCode}`);
        return { 
          success: true, 
          message: "Student deleted from the system"
        };
      } catch (deleteStudentError) {
        console.error("Error deleting student:", deleteStudentError);
        
        // Something prevented complete deletion, but we've at least removed them from this class
        revalidatePath(`/dashboard/classes/${classCode}`);
        return { 
          success: true, 
          message: "Student removed from class but couldn't be deleted completely due to database constraints",
          warning: true
        };
      }
    }

    // If we only wanted to remove from class and that succeeded, return success
    revalidatePath(`/dashboard/classes/${classCode}`);
    return { 
      success: true, 
      message: "Student removed from class"
    };
  } catch (error: any) {
    console.error("Delete student error:", error);
    return { success: false, error: error.message || "Failed to delete student" };
  }
}