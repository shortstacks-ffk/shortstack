import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "./db";
import { Session } from "next-auth";

// Extend the session user type to include our custom properties
// declare module "next-auth" {
//   interface Session {
//     user: {
//       id: string;
//       role: string;
//       teacherId?: string | null;
//       studentId?: string | null;
//       firstName?: string | null;
//       lastName?: string | null;
//       email?: string | null;
//       isSuperUser?: boolean;
//     }
//   }
// }

export async function getAuthSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  // If session doesn't already have teacherId/studentId, fetch them
  if (session.user.role === "TEACHER") {
    if (!session.user.teacherId) {
      // Check if teacher exists
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });
      
      if (teacher) {
        session.user.teacherId = teacher.id;
      } else {
        // Create a teacher profile if it doesn't exist
        try {
          // Get user information to extract name
          const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, email: true }
          });
          
          if (user) {
            const nameParts = user.name?.split(" ") || [];
            const firstName = nameParts[0] || user.email?.split('@')[0] || "Teacher";
            const lastName = nameParts.slice(1).join(" ") || "";
            
            const newTeacher = await db.teacher.create({
              data: {
                userId: session.user.id,
                firstName,
                lastName,
                bio: "",
                institution: "",
              }
            });
            
            session.user.teacherId = newTeacher.id;
            console.log(`Created missing teacher profile in getAuthSession for user ${session.user.id}`);
          }
        } catch (error) {
          console.error("Error creating teacher profile in getAuthSession:", error);
        }
      }
    }
  } 
  else if (session.user.role === "STUDENT" && !session.user.studentId) {
    const student = await db.student.findFirst({
      where: { 
        OR: [
          { userId: session.user.id },
          ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
        ]
      },
      select: { id: true }
    });
    
    if (student) {
      session.user.studentId = student.id;
    }
  } 
  // Handle SUPER users here
  else if (session.user.role === "SUPER") {
    // Super users don't need additional profile setup
    session.user.isSuperUser = true;
  }

  return session;
}
