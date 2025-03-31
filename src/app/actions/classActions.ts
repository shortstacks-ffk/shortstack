'use server';

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";


import { getAuthSession } from "@/src/lib/auth";



// Types
interface ClassData {
  name: string;
  emoji: string;
  cadence?: string;
  day?: string;
  time?: string;
  grade?: string;
}

interface ClassResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Function to generate a random 6-character alphanumeric code
const generateUniqueClassCode = async (userId: string): Promise<string> => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 6;

  while (true) {
    let code = '';
    for (let i = 0; i < codeLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }
    
    // Check uniqueness only for the current user's classes
    const existingClass = await db.class.findFirst({
      where: { 
        AND: [
          { code },
          { userId }
        ]
      }
    });

    if (!existingClass) {
      return code;
    }
  }
};

// Create class
export async function createClass(formData: FormData): Promise<ClassResponse> {
  try {
    // First ensure user exists in our database
    const dbUser = await auth();
    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    if (!dbUser.userId) {
      return { success: false, error: "User ID is missing" };
    }
    const code = await generateUniqueClassCode(dbUser.userId);
    
    const data = {
      name: formData.get('name') as string,
      emoji: formData.get('emoji') as string,
      cadence: formData.get('cadence') as string,
      day: formData.get('day') as string,
      time: formData.get('time') as string,
      grade: formData.get('grade') as string,
      code,
      userId: dbUser.userId // Use the database user ID
    };

    // Verify all required fields are present
    if (!data.name || !data.emoji) {
      return { success: false, error: "Missing required fields" };
    }

    const newClass = await db.class.create({
      data
    });

  // Update revalidation path
  revalidatePath('/dashboard/classes', 'page');
  revalidatePath('/dashboard', 'page');
  return { success: true, data: newClass };
} catch (error) {
  console.error("Create class error:", error);
  return { success: false, error: "Failed to create class" };
}
}

// Get classes
export async function getClasses(): Promise<ClassResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const classes = await db.class.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: classes };
  } catch (error: any) {
    console.error("Get classes error:", error?.message || 'Unknown error');
    return { success: false, error: "Failed to fetch classes" };
  }
}

// Get Class By ID
export const getClassByID = async (id: string) => {

  try {

    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const classData = await db.class.findUnique({
      where: { id }
    });
    return classData;
  } catch (err) {
    console.error(err);
    return null;
  }

}

// Update class
export async function updateClass(id: string, data: ClassData): Promise<ClassResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const updatedClass = await db.class.update({
      where: { id, userId },
      data: {
        ...data
      }
    });

    revalidatePath('/dashboard/classes', 'page');
    revalidatePath('/dashboard', 'page');
    return { success: true, data: updatedClass };
  } catch (error: any) {
    console.error("Update class error:", error?.message || 'Unknown error');
    return { success: false, error: "Failed to update class" };
  }
}

// Delete class
export async function deleteClass(id: string): Promise<ClassResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    await db.class.delete({
      where: { id, userId }
    });

    revalidatePath('/dashboard/classes');
    return { success: true };
  } catch (error: any) {
    console.error("Delete class error:", error?.message || 'Unknown error');
    return { success: false, error: "Failed to delete class" };
  }
}


// This function fetches class data by class code which helps the user go into the class specific page

export async function getClassData(classId: string) {
  try {
    // Try to get session from NextAuth (for students)
    const session = await getAuthSession();
    let userId: string | null = null;
    let isStudent = false;

    if (session?.user?.id && session.user.role === "student") {
      // User is authenticated with NextAuth (student)
      userId = session.user.id;
      isStudent = true;
    } else {
      // Try Clerk auth (for teacher/admin routes)
      try {
        const clerkAuthResult = await auth();
        userId = clerkAuthResult.userId;
      } catch (clerkError) {
        console.error("Clerk auth error:", clerkError);
      }
    }

    if (!userId) {
      console.error("No authenticated user found");
      return null;
    }

    console.log("Auth type:", isStudent ? "Student (NextAuth)" : "Teacher (Clerk)");
    console.log("User ID:", userId);

    let classData;

    if (isStudent) {
      // For students, make sure they're enrolled in this class
      console.log("Fetching class data for student:", userId);
      classData = await db.class.findFirst({
        where: {
          code: classId,
          enrollments: {
            some: {
              studentId: userId,
              enrolled: true
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              imageURL: true
            }
          },
          students: true,
          lessonPlans: {
            include: {
              assignments: true,
              files: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          bills: {
            where: {
              students: {
                some: {
                  studentId: userId
                }
              }
            },
            orderBy: {
              dueDate: 'asc'
            }
          },
          storeItems: {
            where: {
              isAvailable: true
            }
          },
          enrollments: {
            where: {
              studentId: userId
            },
            select: {
              enrolled: true,
              createdAt: true
            }
          }
        }
      });
    } else {
      // For teachers/admins
      console.log("Fetching class data for teacher:", userId);
      classData = await db.class.findUnique({
        where: {
          code: classId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              imageURL: true
            }
          },
          students: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              schoolEmail: true,
              progress: true,
              profileImage: true
            }
          },
          enrollments: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  schoolEmail: true,
                  progress: true,
                  profileImage: true
                }
              }
            }
          },
          lessonPlans: {
            include: {
              assignments: true,
              files: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          bills: {
            include: {
              students: {
                include: {
                  student: true
                }
              }
            },
            orderBy: {
              dueDate: 'asc'
            }
          },
          storeItems: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });
    }

    console.log("Class data found:", !!classData);
    return classData;
  } catch (error) {
    console.error("Error fetching class data:", error);
    throw error;
  }
}