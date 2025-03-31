// Add this at the top of your auth.ts file
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("Warning: NEXTAUTH_SECRET is not defined. This will cause session handling issues.");
}

import { getServerSession } from "next-auth";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/src/lib/db";
import bcrypt from "bcryptjs";

/**
 * Define the auth options here so they can be reused
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "student-login",
      name: "Student Credentials",
      credentials: {
        schoolEmail: { label: "School Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.schoolEmail || !credentials?.password) {
          return null;
        }

        try {
          // Find the student by email (not user - they are different tables!)
          const student = await db.student.findUnique({
            where: {
              schoolEmail: credentials.schoolEmail,
            },
          });

          if (!student || !student.password) {
            return null;
          }

          // Check if password matches
          const passwordMatch = await bcrypt.compare(credentials.password, student.password);

          if (!passwordMatch) {
            return null;
          }

          return {
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            email: student.schoolEmail,
            role: "student", // Hard-coded since this is the student auth flow
            firstName: student.firstName,
            lastName: student.lastName,
            classId: student.classId || "",
            profileImage: student.profileImage || null,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add custom fields to token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.classId = user.classId;
        token.profileImage = user.profileImage;
      }
      return token;
    },
    async session({ session, token }) {
      // Add custom fields to session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.classId = token.classId as string;
        session.user.profileImage = token.profileImage as string | null;
      }
      return session;
    }
  },
  pages: {
    signIn: "/student", // Custom sign-in page
    error: "/student" // Custom error page
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // In production, set secure to true for HTTPS environments
        secure: process.env.NODE_ENV === "production"
      }
    }
  }
};

/**
 * Get the authenticated session on the server
 */
export async function getAuthSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error("Error getting auth session:", error);
    return null;
  }
}

/**
 * Check if the user is authenticated
 */
export async function isAuthenticated() {
  const session = await getAuthSession();
  return !!session;
}

/**
 * Check if the user is a student
 */
export async function isStudent() {
  const session = await getAuthSession();
  return !!session && session.user?.role === 'student';
}

/**
 * Get the current user ID
 */
export async function getCurrentUserId() {
  const session = await getAuthSession();
  return session?.user?.id;
}