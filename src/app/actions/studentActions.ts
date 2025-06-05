'use server';

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/src/lib/auth";
import * as bcrypt from 'bcryptjs';
import { setupBankAccountsForStudent } from "@/src/lib/banking";

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

    // Find the class by code
    const classData = await db.class.findUnique({ 
      where: { code: classCode },
      select: { 
        id: true, 
        userId: true 
      }
    });
    
    if (!classData) {
      console.error(`Class not found with code: ${classCode}`);
      return { success: false, error: "Class not found" };
    }
    
    // Verify the teacher owns this class
    if (classData.userId !== session.user.id) {
      console.error("Access denied: Teacher doesn't own this class");
      return { success: false, error: "You don't have permission to access this class" };
    }

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
      progress: enrollment.student.progress || 0,
      enrolled: enrollment.enrolled
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
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
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
      where: { code: classCode } 
    });
    
    if (!classData) {
      console.error(`Class not found with code: ${classCode}`);
      return { success: false, error: "Class not found" };
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
      
      try {
        // IMPORTANT CHANGE: Store teacher's actual ID in teacherId
        student = await db.student.create({
          data: {
            firstName,
            lastName,
            schoolEmail,
            password: hashedPassword,
            progress: 0,
            classId: classCode,
            teacherId: session.user.id, // Store the teacher's ID in teacherId
            teacherName: session.user.name || "" // Store the teacher's name separately
          }
        });
        console.log("Student created with ID:", student.id);
        
        // Create bank accounts immediately after student creation
        await setupBankAccountsForStudent(student.id);
        
      } catch (createError) {
        console.error("Error creating student:", createError);
        return { 
          success: false, 
          error: "Failed to create student: " + (createError instanceof Error ? createError.message : "Unknown error") 
        };
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
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Find the class by code
    const classData = await db.class.findUnique({ 
      where: { code: classCode },
      select: { 
        id: true, 
        userId: true,
        name: true,
        emoji: true
      }
    });
    
    if (!classData) {
      return { success: false, error: "Class not found" };
    }
    
    // Verify the teacher owns this class
    if (classData.userId !== session.user.id) {
      return { success: false, error: "You don't have permission to access this class" };
    }

    // Check that the student exists - but don't restrict by teacherId
    // This allows finding any student the teacher should have access to
    const student = await db.student.findUnique({ 
      where: { id: studentId }
    });
    
    if (!student) {
      return { success: false, error: "Student not found" };
    }

    // Prevent duplicate enrollment
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
    
    // Update the student's teacher if it's not set correctly
    if (student.teacherId !== session.user.id) {
      await db.student.update({
        where: { id: student.id },
        data: { 
          teacherId: session.user.id 
        }
      });
    }

    // Send email notification to the student about being added to the class
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email`, {
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
          // No password needed since this is an existing student
          isNewStudent: false, // This is not a new student
          isPasswordReset: false // This is not a password reset
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.error("Email notification failed:", result.error);
        // Continue with enrollment even if email fails
        // But return a warning to the UI
        revalidatePath(`/teacher/dashboard/classes/${classCode}`);
        return { 
          success: true, 
          data: enrollment,
          warning: "Student was added to the class but the notification email couldn't be sent."
        };
      }
    } catch (emailError) {
      console.error("Failed to send class addition email:", emailError);
      // Continue even if email fails, but return a warning
      revalidatePath(`/teacher/dashboard/classes/${classCode}`);
      return { 
        success: true, 
        data: enrollment,
        warning: "Student was added to the class but the notification email couldn't be sent."
      };
    }

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
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    const classData = await db.class.findUnique({ 
      where: { code: classCode },
      select: { id: true, userId: true }
    });
    
    if (!classData) {
      return { success: false, error: "Class not found" };
    }
    
    // Verify the teacher owns this class
    if (classData.userId !== session.user.id) {
      return { success: false, error: "You don't have permission to access this class" };
    }

    // Get the IDs of students already enrolled in the class
    const enrolledStudentIds = await db.enrollment.findMany({
      where: { classId: classData.id },
      select: { studentId: true }
    }).then(enrollments => enrollments.map(e => e.studentId));

    console.log(`Found ${enrolledStudentIds.length} already enrolled students`);

    // Search for all students created by this teacher
    // Use more flexible criteria to find students
    const students = await db.student.findMany({
      where: {
        AND: [
          { id: { notIn: enrolledStudentIds.length > 0 ? enrolledStudentIds : ['no-students'] } },
          {
            OR: [
              // Students where teacherId is the teacher's user ID
              { teacherId: session.user.id },
              // Students where teacherId is the teacher's name (from old records)
              { teacherId: session.user.name || '' }, 
              // Students that have this teacher's classes as their primary class
              {
                classId: {
                  in: await db.class.findMany({
                    where: { userId: session.user.id },
                    select: { code: true }
                  }).then(classes => classes.map(c => c.code))
                }
              }
            ]
          }
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
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Find the class by code
    const classData = await db.class.findUnique({ where: { code: classCode } });
    if (!classData) return { success: false, error: "Invalid class code" };

    // Verify student ID belongs to the current user 
    const student = await db.student.findUnique({
      where: { 
        id: studentId,
        userId: session.user.id // Only allow joining if student belongs to this user
      }
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }

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
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
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
    
    // Prepare update data
    const updateData: any = {
      firstName,
      lastName,
      schoolEmail,
    };

    // Only hash and update password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }
    
    // Update the student
    const updatedStudent = await db.student.update({
      where: { id: studentId },
      data: updateData
    });

    // Find the class name for the email
    const classDetails = await db.class.findUnique({
      where: { code: classCode },
      select: { name: true }
    });
    
    // Send email notification if password was updated
    if (password) {
      try {
        // THIS IS THE CRITICAL PART THAT NEEDS FIXING:
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
            isNewStudent: false, // IMPORTANT: This must be false
            isPasswordReset: true  // IMPORTANT: This must be true
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
    
    revalidatePath(`/dashboard/classes/${classCode}`);
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
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Find the class by code
    const classData = await db.class.findUnique({ 
      where: { code: classCode },
      select: { id: true, userId: true }
    });
    
    if (!classData) {
      return { success: false, error: "Class not found" };
    }
    
    // Verify the teacher owns this class
    if (classData.userId !== session.user.id) {
      return { success: false, error: "You don't have permission to access this class" };
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

    // Get the student record to check if this is their primary class
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            class: true
          }
        }
      }
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    console.log(`Processing student ${studentId} with options:`, options);
    
    // Handle full deletion if requested
    if (!options.removeFromClassOnly) {
      console.log("Attempting complete student deletion");
      
      try {
        // Delete all enrollments first
        await db.enrollment.deleteMany({
          where: { studentId: studentId }
        });
        
        // Delete bank accounts and related records
        await db.bankAccount.deleteMany({
          where: { studentId: studentId }
        });
        
        // Delete bank statements
        await db.bankStatement.deleteMany({
          where: { studentId: studentId }
        });
        
        // Remove from any bills
        await db.studentBill.deleteMany({
          where: { studentId: studentId }
        });
        
        // Finally delete the student record
        await db.student.delete({
          where: { id: studentId }
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
        
        // Check if this was the student's primary class (classId in the student record)
        if (student.classId === classCode) {
          // Find another class to use as primary, if any
          const otherEnrollments = student.enrollments.filter(e => e.class.code !== classCode);
          
          if (otherEnrollments.length > 0) {
            // Set another class as the primary class
            await db.student.update({
              where: { id: studentId },
              data: {
                classId: otherEnrollments[0].class.code
              }
            });
          } else {
            // No other classes, but keep the student record
            // Make sure teacherId is still associated with this teacher
            await db.student.update({
              where: { id: studentId },
              data: {
                teacherId: session.user.id
              }
            });
          }
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

// Create bank accounts for a student when they are enrolled
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
    let student = await db.student.findUnique({
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
    
    // If still not found, try directly by ID as a last resort
    if (!student) {
      student = await db.student.findUnique({
        where: { id: session.user.id },
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
        _count: classData._count,
        createdAt: classData.createdAt.toISOString(),
        overview: classData.overview,
      };
    });

    return { success: true, data: classes };
  } catch (error) {
    console.error("Get student classes error:", error);
    return { success: false, error: "Failed to fetch student classes" };
  }
}

// Add multiple existing students to a class
export async function addMultipleExistingStudentsToClass(studentIds: string[], classCode: string) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Find the class by code
    const classData = await db.class.findUnique({ 
      where: { code: classCode },
      select: { 
        id: true, 
        userId: true,
        name: true,
        emoji: true
      }
    });
    
    if (!classData) {
      return { success: false, error: "Class not found" };
    }
    
    // Verify the teacher owns this class
    if (classData.userId !== session.user.id) {
      return { success: false, error: "You don't have permission to access this class" };
    }

    // Get all the student records
    const students = await db.student.findMany({
      where: { id: { in: studentIds } }
    });
    
    if (students.length === 0) {
      return { success: false, error: "No valid students found" };
    }
    
    // Check which students are already enrolled
    const existingEnrollments = await db.enrollment.findMany({
      where: {
        studentId: { in: studentIds },
        classId: classData.id
      }
    });
    
    const alreadyEnrolledIds = existingEnrollments.map(e => e.studentId);
    const newStudentIds = studentIds.filter(id => !alreadyEnrolledIds.includes(id));
    
    if (newStudentIds.length === 0) {
      return { success: false, error: "All selected students are already enrolled in this class" };
    }

    // Create enrollments for the new students
    await db.enrollment.createMany({
      data: newStudentIds.map(studentId => ({
        studentId,
        classId: classData.id,
        enrolled: false
      }))
    });
    
    // Update teacherId for students if needed
    await db.student.updateMany({
      where: { 
        id: { in: newStudentIds },
        NOT: { teacherId: session.user.id }
      },
      data: { teacherId: session.user.id }
    });

    // Send email notifications in the background using Promise.all
    // This won't block the response even if some emails fail
    Promise.all(
      students
        .filter(student => newStudentIds.includes(student.id))
        .map(student => 
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
          }).catch(err => console.error(`Email error for ${student.schoolEmail}:`, err))
        )
    );

    revalidatePath(`/teacher/dashboard/classes/${classCode}`);
    return { 
      success: true, 
      data: { 
        added: newStudentIds.length,
        total: studentIds.length
      }
    };

  } catch (error: any) {
    console.error("Add multiple students error:", error);
    return { success: false, error: "Failed to add students to class" };
  }
}