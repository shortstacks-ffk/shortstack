'use server';

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/src/lib/auth";
import * as bcrypt from 'bcryptjs';
import { setupBankAccountsForStudent } from "@/src/lib/banking";
import { Prisma, Role } from "@prisma/client";

// Utility function to generate random passwords (unchanged)
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
  console.log("Server action getStudentsByClass called with code:", classCode);
  
  try {
    const session = await getAuthSession();
    
    // Handle missing or invalid session
    if (!session?.user?.id) {
      console.error("Unauthorized: No user session");
      return { success: false, error: "Unauthorized: Please log in" };
    }
    
    if (session.user.role !== "TEACHER") {
      console.error("Unauthorized: Not a teacher role");
      return { success: false, error: "Unauthorized: Teacher access required" };
    }

    if (!classCode) {
      console.error("Missing classCode parameter");
      return { success: false, error: "Class code is required" };
    }

    // Find the class by code and ensure it's owned by this teacher
    const classData = await db.class.findUnique({ 
      where: { 
        code: classCode,
        teacherId: session.user.teacherId || undefined // Use teacherId instead of userId, handle null case
      },
      select: { 
        id: true,
        teacherId: true
      }
    });
    
    if (!classData) {
      console.error(`Class not found with code: ${classCode}`);
      return { success: false, error: "Class not found or you don't have access" };
    }

    // Get students enrolled in the class
    const enrollments = await db.enrollment.findMany({
      where: { classId: classData.id },
      include: { 
        student: {
          include: {
            user: {
              select: {
                email: true,
                image: true
              }
            }
          }
        }
      }
    });

    // Transform the data for the UI
    const students = enrollments.map(enrollment => ({
      id: enrollment.student.id,
      firstName: enrollment.student.firstName,
      lastName: enrollment.student.lastName,
      schoolEmail: enrollment.student.schoolEmail,
      progress: enrollment.student.progress || 0,
      enrolled: enrollment.enrolled,
      profileImage: enrollment.student.profileImage || enrollment.student.user?.image
    }));

    // Calculate enrollment stats
    const enrollmentStats = {
      total: enrollments.length,
      enrolled: enrollments.filter(e => e.enrolled).length
    };

    console.log(`Found ${students.length} students for class ${classCode}`);
    
    return {
      success: true,
      data: {
        students,
        enrollmentStats
      }
    };
  } catch (error) {
    console.error("Get students error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch students" 
    };
  }
}

// Create a new student and enroll them in a class
export async function createStudent(formData: FormData, classCode: string) {
  try {
    console.log("Starting createStudent with class code:", classCode);
    
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER" || !session.user.teacherId) {
      return { success: false, error: "Unauthorized or missing teacher profile" };
    }

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

    // Find the class by code
    const classData = await db.class.findUnique({ 
      where: { 
        code: classCode,
        teacherId: session.user.teacherId
      }
    });
    
    if (!classData) {
      console.error(`Class not found with code: ${classCode}`);
      return { success: false, error: "Class not found or you don't have access" };
    }
    
    // Check if the student already exists
    let student = await db.student.findUnique({ 
      where: { schoolEmail },
      include: { user: true }
    });
    
    // If student exists, check if they're already in this class
    if (student) {
      const existingEnrollment = await db.enrollment.findFirst({
        where: { 
          studentId: student.id, 
          classId: classData.id 
        }
      });
      
      if (existingEnrollment) {
        return { success: false, error: "Student already enrolled in this class" };
      }
    }
    
    // Set password - generate if needed
    let finalPassword = password;
    if (generateTemporaryPassword) {
      finalPassword = generateRandomPassword();
    } else if (!password && !student) {
      return { success: false, error: "Password is required for new students" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // If student doesn't exist, create them with a linked user account
    if (!student) {
      try {
        // Create student and user in a transaction to ensure data consistency
        const result = await db.$transaction(async (tx) => {
          // Create a user account first
          const user = await tx.user.create({
            data: {
              name: `${firstName} ${lastName}`,
              email: schoolEmail,
              password: hashedPassword,
              role: Role.STUDENT,
              image: null // Use default image or let it be null
            }
          });

          // Create student record linked to the user
          const newStudent = await tx.student.create({
            data: {
              firstName,
              lastName,
              schoolEmail,
              password: hashedPassword, // Store password in student record for legacy support
              progress: 0,
              teacherId: session.user.teacherId || '', // Ensure teacherId is not null
              teacherName: session.user.name || "",
              userId: user.id // Use userId instead of user connect
            }
          });
          
          return { student: { ...newStudent, user }, user };
        });
        
        student = result.student;
        console.log("Student created with ID:", student.id);
        
        // Create bank accounts immediately after student creation
        await createStudentBankAccounts(student.id);
        
      } catch (createError: any) {
        console.error("Error creating student:", createError);
        
        // Check if it's a unique constraint error on email
        if (createError.code === 'P2002' && 
            createError.meta?.target?.includes('email')) {
          
          // Check if the existing user is a teacher
          const existingUser = await db.user.findUnique({
            where: { email: schoolEmail },
            select: { role: true }
          });
          
          if (existingUser?.role === 'TEACHER') {
            return { 
              success: false, 
              error: "This email is already in use by a TEACHER account. Please use a different email." 
            };
          } else {
            return { 
              success: false, 
              error: "This email is already in use. Please use a different email." 
            };
          }
        }
        
        return { 
          success: false, 
          error: "Failed to create student: " + (createError instanceof Error ? createError.message : "Unknown error") 
        };
      }
    } else {
      // If student exists but no user account, create a user account
      if (!student.user) {
        try {
          const user = await db.user.create({
            data: {
              name: `${firstName} ${lastName}`,
              email: schoolEmail,
              password: hashedPassword,
              role: Role.STUDENT,
              student: {
                connect: {
                  id: student.id
                }
              }
            }
          });
          
          // Update student record with userId
          await db.student.update({
            where: { id: student.id },
            data: { userId: user.id }
          });
        } catch (userCreateError) {
          console.error("Error creating user for existing student:", userCreateError);
          // Continue with the enrollment process even if user creation fails
        }
      }
    }

    // Create the enrollment
    try {
      const enrollment = await db.enrollment.create({
        data: {
          studentId: student.id,
          classId: classData.id,
          enrolled: false
        }
      });

      console.log("Enrollment created successfully");
    } catch (enrollError) {
      console.error("Error creating enrollment:", enrollError);
      // Continue with the process even if enrollment fails
    }

    // Send invitation email using our API
    const isNewStudent = student.createdAt > new Date(Date.now() - 5000);
    
    try {
      // Use direct fetch to our email API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: schoolEmail,
          firstName,
          lastName,
          className: classData.name,
          classCode,
          email: schoolEmail,
          password: isNewStudent ? finalPassword : undefined,
          isNewStudent
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.error("Email API error:", result.error);
        revalidatePath(`/teacher/dashboard/classes/${classCode}`);
        return { 
          success: true, 
          data: { student, enrollment: true },
          warning: "Student was added but the invitation email couldn't be sent. Please provide login details manually."
        };
      }
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Continue with enrollment even if email fails
      // But return a warning to the UI
      revalidatePath(`/teacher/dashboard/classes/${classCode}`);
      return { 
        success: true, 
        data: { student, enrollment: true },
        warning: "Student was added but the invitation email couldn't be sent. Please provide login details manually."
      };
    }

    revalidatePath(`/teacher/dashboard/classes/${classCode}`);
    return { success: true, data: { student, enrollment: true } };

  } catch (error: any) {
    console.error("Create student error:", error);
    return { success: false, error: error.message || "Failed to create student" };
  }
}

// Add an existing student to a class
export async function addExistingStudentToClass(studentId: string, classCode: string) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER" || !session.user.teacherId) {
      return { success: false, error: "Unauthorized or missing teacher profile" };
    }

    // Find the class by code
    const classData = await db.class.findUnique({ 
      where: { 
        code: classCode,
        teacherId: session.user.teacherId 
      },
      select: { 
        id: true,
        name: true,
        emoji: true
      }
    });
    
    if (!classData) {
      return { success: false, error: "Class not found or you don't have access" };
    }

    // Check that the student exists
    const student = await db.student.findUnique({ 
      where: { id: studentId },
      include: { user: true }
    });
    
    if (!student) {
      return { success: false, error: "Student not found" };
    }

    // Prevent duplicate enrollment
    const existingEnrollment = await db.enrollment.findFirst({
      where: { 
        studentId: student.id, 
        classId: classData.id 
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
    
    // Update the student's teacher if needed
    if (student.teacherId !== session.user.teacherId) {
      await db.student.update({
        where: { id: student.id },
        data: { teacherId: session.user.teacherId }
      });
    }

    // Send email notification asynchronously - don't await the result
    // This allows the function to return quicker
    const emailPromise = fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: student.schoolEmail,
        firstName: student.firstName,
        lastName: student.lastName,
        className: classData.name,
        classCode: classCode,
        email: student.schoolEmail,
        isNewStudent: false,
        isPasswordReset: false
      }),
    }).catch(emailError => {
      console.error("Failed to send class addition email:", emailError);
      // We're handling this asynchronously, so we don't need to return anything
    });

    // Don't await the email - we'll handle any errors on the client
    revalidatePath(`/teacher/dashboard/classes/${classCode}`);
    return { success: true, data: enrollment };

  } catch (error: any) {
    console.error("Add existing student error:", error);
    return { success: false, error: "Failed to add student to class" };
  }
}

// Get all available students not yet enrolled in the specified class
export async function getAvailableStudents(classCode: string) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER" || !session.user.teacherId) {
      return { success: false, error: "Unauthorized or missing teacher profile" };
    }

    // Find the class by code
    const classData = await db.class.findUnique({ 
      where: { 
        code: classCode,
        teacherId: session.user.teacherId
      },
      select: { id: true }
    });
    
    if (!classData) {
      return { success: false, error: "Class not found or you don't have access" };
    }

    // Get the IDs of students already enrolled in the class
    const enrolledStudentIds = await db.enrollment.findMany({
      where: { classId: classData.id },
      select: { studentId: true }
    }).then(enrollments => enrollments.map(e => e.studentId));

    console.log(`Found ${enrolledStudentIds.length} already enrolled students`);

    // Get students that this teacher has access to but aren't enrolled in this class
    const students = await db.student.findMany({
      where: {
        AND: [
          { id: { notIn: enrolledStudentIds.length > 0 ? enrolledStudentIds : ['no-students'] } },
          { teacherId: session.user.teacherId }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolEmail: true
      },
      orderBy: { firstName: 'asc' }
    });

    console.log(`Found ${students.length} available students`);
    
    return { success: true, data: students };

  } catch (error) {
    console.error("Get available students error:", error);
    return { success: false, error: "Failed to fetch available students" };
  }
}

// Student joining a class: update the enrollment record to mark as enrolled
export async function joinClass(classCode: string, studentId: string) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return { success: false, error: "Unauthorized: Student access required" };
    }

    // Find the class by code
    const classData = await db.class.findUnique({
      where: { code: classCode },
      select: { id: true, name: true, emoji: true }
    });
    
    if (!classData) {
      return { success: false, error: "Invalid class code" };
    }

    // Verify student ID belongs to the current user 
    let student = await db.student.findUnique({
      where: { 
        userId: session.user.id
      }
    });

    // If not found by userId, try by the ID directly or by email
    if (!student && session.user.email) {
      student = await db.student.findFirst({
        where: { 
          schoolEmail: session.user.email 
        }
      });
    }

    if (!student && session.user.studentId) {
      student = await db.student.findUnique({
        where: { id: session.user.studentId }
      });
    }

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    // Find the enrollment
    let enrollment = await db.enrollment.findFirst({
      where: {
        studentId: student.id,
        classId: classData.id
      }
    });

    if (!enrollment) {
      // Create new enrollment if it doesn't exist
      enrollment = await db.enrollment.create({
        data: {
          studentId: student.id,
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
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER" || !session.user.teacherId) {
      return { success: false, error: "Unauthorized or missing teacher profile" };
    }
    
    // Extract fields from form data
    const firstName = formData.get('firstName')?.toString().trim();
    const lastName = formData.get('lastName')?.toString().trim();
    const schoolEmail = formData.get('schoolEmail')?.toString().trim();
    const password = formData.get('password')?.toString().trim();
    
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
    
    // Find the student
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { user: true }
    });
    
    if (!student) {
      return { success: false, error: "Student not found" };
    }
    
    // Check teacher has permission to edit this student
    if (student.teacherId !== session.user.teacherId) {
      return { success: false, error: "You don't have permission to update this student" };
    }
    
    try {
      // Perform updates in a transaction to ensure consistency
      await db.$transaction(async (tx) => {
        // Student update data
        const studentData: Prisma.StudentUpdateInput = {
          firstName,
          lastName,
          schoolEmail,
        };

        // User update data
        const userData: Prisma.UserUpdateInput = {
          name: `${firstName} ${lastName}`,
          email: schoolEmail,
        };
        
        // Only hash and update password if provided
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          studentData.password = hashedPassword;
          userData.password = hashedPassword;
        }
        
        // Update the student record
        await tx.student.update({
          where: { id: studentId },
          data: studentData
        });
        
        // Update the linked user if it exists
        if (student.userId) {
          await tx.user.update({
            where: { id: student.userId },
            data: userData
          });
        } else {
          // Create user record if it doesn't exist
          const newUser = await tx.user.create({
            data: {
              name: `${firstName} ${lastName}`,
              email: schoolEmail,
              password: student.password, // Use existing hashed password
              role: Role.STUDENT,
              student: {
                connect: { id: studentId }
              }
            }
          });
          
          // Update student with user ID
          await tx.student.update({
            where: { id: studentId },
            data: { userId: newUser.id }
          });
        }
      });
    } catch (updateError) {
      console.error("Transaction error updating student:", updateError);
      return { success: false, error: "Failed to update student data" };
    }

    // Find the class name for the email
    const classDetails = await db.class.findUnique({
      where: { code: classCode },
      select: { name: true }
    });
    
    // Send email notification if password was updated
    if (password) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: schoolEmail,
            firstName,
            lastName,
            className: classDetails?.name || "your class",
            classCode,
            email: schoolEmail,
            password: password, // Include the new password
            isNewStudent: false,
            isPasswordReset: true
          }),
        });
        
        const result = await response.json();
        
        if (!result.success) {
          console.error("Email API error:", result.error);
        }
      } catch (emailError) {
        console.error("Failed to send password update email:", emailError);
      }
    }
    
    revalidatePath(`/teacher/dashboard/classes/${classCode}`);
    
    // Get the updated student data to return
    const updatedStudent = await db.student.findUnique({
      where: { id: studentId }
    });
    
    return { success: true, data: updatedStudent };
  } catch (error) {
    console.error("Update student error:", error);
    return { success: false, error: "Failed to update student" };
  }
}

// Delete a student with options to remove from class or delete completely
export async function deleteStudent(
  classCode: string, 
  studentId: string, 
  options: { removeFromClassOnly: boolean } = { removeFromClassOnly: true }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER" || !session.user.teacherId) {
      return { success: false, error: "Unauthorized or missing teacher profile" };
    }

    // Find the class by code
    const classData = await db.class.findUnique({ 
      where: { 
        code: classCode,
        teacherId: session.user.teacherId 
      },
      select: { id: true }
    });
    
    if (!classData) {
      return { success: false, error: "Class not found or you don't have access" };
    }

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

    // Get the student record with their enrollments
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            class: true
          }
        },
        user: true
      }
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }
    
    // Verify teacher has access to this student
    if (student.teacherId !== session.user.teacherId) {
      return { success: false, error: "You don't have permission to manage this student" };
    }

    console.log(`Processing student ${studentId} with options:`, options);
    
    // Handle full deletion if requested
    if (!options.removeFromClassOnly) {
      console.log("Attempting complete student deletion");
      
      try {
        await db.$transaction(async (tx) => {
          // Delete all enrollments first
          await tx.enrollment.deleteMany({
            where: { studentId: studentId }
          });
          
          // Delete bank accounts and related records
          await tx.bankAccount.deleteMany({
            where: { studentId: studentId }
          });
          
          // Delete bank statements (though this should cascade)
          await tx.bankStatement.deleteMany({
            where: { studentId: studentId }
          });
          
          // Remove student bills
          await tx.studentBill.deleteMany({
            where: { studentId: studentId }
          });
          
          // Delete associated calendar events
          await tx.calendarEvent.deleteMany({
            where: { studentId: studentId }
          });
          
          // Delete the student record
          await tx.student.delete({
            where: { id: studentId }
          });
          
          // Delete the user account if it exists
          if (student.userId) {
            await tx.user.delete({
              where: { id: student.userId }
            });
          }
        });
        
        console.log("Student completely deleted");
        
        revalidatePath(`/teacher/dashboard/classes/${classCode}`);
        return { 
          success: true, 
          message: "Student has been completely deleted from the system"
        };
      } catch (error) {
        console.error("Failed to fully delete student:", error);
        // Fall back to removing from class only
        try {
          await db.enrollment.delete({
            where: { id: enrollment.id }
          });
          
          revalidatePath(`/teacher/dashboard/classes/${classCode}`);
          return { 
            success: true, 
            message: "Student could not be fully deleted, but was removed from this class",
            warning: true
          };
        } catch (fallbackError) {
          console.error("Even class removal failed:", fallbackError);
          return { success: false, error: "Failed to remove student from class" };
        }
      }
    } else {
      // Remove from this class only
      console.log("Removing student from class only");
      
      try {
        // First delete the enrollment
        await db.enrollment.delete({
          where: { id: enrollment.id }
        });
        
        // Find another class to use as primary, if any
        const otherEnrollments = student.enrollments.filter(e => e.class.code !== classCode);
        
        if (otherEnrollments.length > 0) {
          // Update student record if they have other classes
          await db.student.update({
            where: { id: studentId },
            data: {
              // No need to set class here as we handle enrollments separately
            }
          });
        }
        
        console.log("Student successfully removed from class");
        
        revalidatePath(`/teacher/dashboard/classes/${classCode}`);
        return { 
          success: true, 
          message: "Student has been removed from this class"
        };
      } catch (error) {
        console.error("Failed to remove student from class:", error);
        return { success: false, error: "Failed to remove student from class" };
      }
    }
  } catch (error) {
    console.error("Delete student error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete student"
    };
  }
}

// Create bank accounts for a student when they are enrolled (unchanged)
export async function createStudentBankAccounts(studentId: string) {
  try {
    const result = await setupBankAccountsForStudent(studentId);
    
    if (result.success) {
      revalidatePath("/teacher/dashboard/bank");
      return { success: true, data: result.data };
    } else {
      return { success: false, error: "An unknown error occurred while creating bank accounts" };
    }
  } catch (error) {
    console.error("Error creating bank accounts:", error);
    return { success: false, error: "Failed to create bank accounts" };
  }
}

// Get all classes that a student has joined with full details
export async function getStudentClasses() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }
    
    if (session.user.role !== "STUDENT") {
      return { success: false, error: "Unauthorized: Student role required" };
    }

    // Try multiple ways to find the student profile
    let student = await db.student.findFirst({
      where: {
        userId: session.user.id
      },
      select: { id: true }
    });
    
    // If not found by userId, try finding by the email
    if (!student && session.user.email) {
      student = await db.student.findFirst({
        where: { 
          schoolEmail: session.user.email 
        },
        select: { id: true }
      });
    }
    
    // If still not found, try directly by studentId
    if (!student && session.user.studentId) {
      student = await db.student.findUnique({
        where: { id: session.user.studentId },
        select: { id: true }
      });
    }

    if (!student) {
      console.error(`Student profile not found for user ${session.user.id} with email ${session.user.email}`);
      return { success: false, error: "Student profile not found" };
    }

    // Get all classes the student is enrolled in
    const enrolledClasses = await db.enrollment.findMany({
      where: {
        studentId: student.id,
        enrolled: true // Only get classes where the student is actively enrolled
      },
      select: {
        class: {
          include: {
            classSessions: true,
            teacher: {
              select: { firstName: true, lastName: true }
            },
            _count: {
              select: { 
                enrollments: {
                  where: { enrolled: true }
                } 
              }
            }
          }
        }
      }
    });

    // Format the classes for easier consumption in the frontend
    const classes = enrolledClasses.map(enrollment => {
      const classData = enrollment.class;
      return {
        id: classData.id,
        name: classData.name,
        code: classData.code,
        emoji: classData.emoji,
        color: classData.color,
        grade: classData.grade,
        classSessions: classData.classSessions,
        teacher: classData.teacher ? `${classData.teacher.firstName} ${classData.teacher.lastName}` : 'Teacher',
        _count: classData._count,
        createdAt: classData.createdAt.toISOString(),
        overview: classData.overview,
      };
    });

    return { success: true, data: classes };
  } catch (error) {
    console.error("Get student classes error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch student classes" 
    };
  }
}