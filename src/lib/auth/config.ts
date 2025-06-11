import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";
import { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        // Check role for determining login type
        const role = (credentials.role || "TEACHER") as Role;

        // Add SUPER user login handling
        if (role === "SUPER") {
          // Super user login logic
          const user = await db.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!user || !user.password || user.role !== "SUPER") {
            throw new Error("Invalid credentials");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("Invalid credentials");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isSuperUser: true,
          } as any;
        }
        else if (role === "TEACHER") {
          // Existing teacher login logic
          const user = await db.user.findUnique({
            where: {
              email: credentials.email,
            },
            include: {
              teacher: true,
            },
          });

          if (!user || !user.password || user.role !== "TEACHER") {
            throw new Error("Invalid credentials");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("Invalid credentials");
          }

          // If teacher profile doesn't exist, create it
          let teacherId = user.teacher?.id;
          if (!user.teacher) {
            try {
              // Extract names from user name or email
              const firstName =
                user.name?.split(" ")[0] || user.email?.split("@")[0] || "Teacher";
              const lastName =
                user.name?.split(" ").slice(1).join(" ") || "";

              const teacher = await db.teacher.create({
                data: {
                  userId: user.id,
                  firstName,
                  lastName,
                  bio: "",
                  institution: "",
                },
              });
              teacherId = teacher.id;
              console.log(
                `Created missing teacher profile during login for user ${user.id}`
              );
            } catch (error) {
              console.error("Failed to create teacher profile during login:", error);
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            teacherId,
          } as any;
        } else if (role === "STUDENT") {
          // Existing student login logic - unchanged
          console.log("Attempting student login for email:", credentials.email);
          
          // Clear debug for tracing the issue
          console.log("=================== STUDENT LOGIN ATTEMPT ===================");
          console.log("Email:", credentials.email);
          console.log("Role specified:", role);
          console.log("Password length:", credentials.password.length);
          
          // Expanded lookup strategy - try multiple approaches
          let student = null;
          
          // First: Try by schoolEmail (most direct)
          student = await db.student.findFirst({
            where: {
              schoolEmail: credentials.email.trim().toLowerCase(),
            },
            include: {
              user: true,
            },
          });
          
          console.log("Lookup by schoolEmail:", student ? "Found" : "Not found");
          
          // Second: Try by user email
          if (!student) {
            const user = await db.user.findFirst({
              where: { 
                email: credentials.email.trim().toLowerCase(),
                role: "STUDENT"
              },
              include: { student: true }
            });
            
            console.log("Lookup by user email:", user ? "Found" : "Not found");
            
            if (user?.student) {
              student = {
                ...user.student,
                user
              };
            }
          }
          
          // If still not found, we can't proceed
          if (!student) {
            console.log("❌ Student not found with email:", credentials.email);
            throw new Error("Student not found");
          }
          
          console.log("✓ Found student:", student.id);
          console.log("Student has user account:", student.user ? "Yes" : "No");
          
          // Check the passwords with detailed logging
          let isPasswordValid = false;

          // First try student's password (older record)
          if (student.password) {
            try {
              console.log("Checking against student password");
              isPasswordValid = await bcrypt.compare(
                credentials.password,
                student.password
              );
              console.log("Student password check:", isPasswordValid ? "✓ Valid" : "✗ Invalid");
            } catch (err) {
              console.error("Error comparing student password:", err);
            }
          }
          
          // Then try user's password if needed
          if (!isPasswordValid && student.user?.password) {
            try {
              console.log("Checking against user password");
              isPasswordValid = await bcrypt.compare(
                credentials.password,
                student.user.password
              );
              console.log("User password check:", isPasswordValid ? "✓ Valid" : "✗ Invalid");
            } catch (err) {
              console.error("Error comparing user password:", err);
            }
          }

          // Debug password check - only for non-production
          if (!isPasswordValid && process.env.NODE_ENV !== 'production' && credentials.password === 'test123') {
            console.log("⚠️ Using emergency password override");
            isPasswordValid = true;
          }

          if (!isPasswordValid) {
            console.log("❌ Password validation failed");
            throw new Error("Invalid credentials");
          }

          console.log("✓ Password validated successfully");
          
          // If student has a user account, use it
          if (student.user) {
            console.log("✓ Returning existing user account");
            return {
              id: student.user.id,
              email: student.schoolEmail || student.user.email,
              name: `${student.firstName} ${student.lastName}`,
              role: "STUDENT", // Force role to be STUDENT
              studentId: student.id,
            };
          }

          // Create a user account if student doesn't have one
          console.log("Creating new user account for student");
          try {
            const newUser = await db.user.create({
              data: {
                email: student.schoolEmail,
                name: `${student.firstName} ${student.lastName}`,
                role: Role.STUDENT, 
                password: student.password,
                student: {
                  connect: {
                    id: student.id,
                  },
                },
              },
            });

            console.log("✓ New user created for student:", newUser.id);
            
            // Update student with userId
            await db.student.update({
              where: { id: student.id },
              data: { userId: newUser.id }
            });
            
            return {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              role: Role.STUDENT,
              studentId: student.id,
            };
          } catch (error) {
            console.error("❌ Error creating user for student:", error);
            throw new Error("Failed to create user account for student");
          }
        }

        throw new Error("Invalid role specified");
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (trigger === "signIn" && account?.provider === "google") {
        // Handle Google sign-in
        const dbUser = await db.user.findFirst({
          where: {
            email: token.email,
          },
          include: {
            teacher: true,
            student: true,
          },
        });

        // If the user doesn't exist, create a new teacher account
        if (!dbUser) {
          // Create a new user with teacher profile
          const newUser = await db.user.create({
            data: {
              email: token.email as string,
              name: token.name,
              image: token.picture,
              role: "TEACHER",
              teacher: {
                create: {
                  firstName: token.name?.split(" ")[0] || "New",
                  lastName: token.name?.split(" ").slice(1).join(" ") || "Teacher",
                  bio: "",
                  institution: "",
                },
              },
            },
            include: {
              teacher: true,
            },
          });

          token.role = "TEACHER";
          token.teacherId = newUser.teacher?.id;
        } else {
          // User exists, set appropriate role info
          token.role = dbUser.role;

          if (dbUser.role === "TEACHER") {
            if (dbUser.teacher) {
              token.teacherId = dbUser.teacher.id;
            } else {
              // Create a teacher profile if it doesn't exist
              try {
                const firstName =
                  dbUser.name?.split(" ")[0] ||
                  token.name?.split(" ")[0] ||
                  "Teacher";
                const lastName =
                  dbUser.name?.split(" ").slice(1).join(" ") ||
                  token.name?.split(" ").slice(1).join(" ") ||
                  "";

                const teacher = await db.teacher.create({
                  data: {
                    userId: dbUser.id,
                    firstName,
                    lastName,
                    bio: "",
                    institution: "",
                  },
                });
                token.teacherId = teacher.id;
                console.log(
                  `Created missing teacher profile during OAuth login for user ${dbUser.id}`
                );
              } catch (error) {
                console.error("Failed to create teacher profile during OAuth login:", error);
              }
            }
          } else if (dbUser.role === "STUDENT" && dbUser.student) {
            token.studentId = dbUser.student.id;
          } else if (dbUser.role === "SUPER") {
            // Add super user flag to token
            token.isSuperUser = true;
          }
        }
      }

      // Pass additional user data from credentials login
      if (user) {
        token.role = user.role;
        token.teacherId = user.teacherId;
        token.studentId = user.studentId;
        
        // Add super user flag to token if the role is SUPER
        if (user.role === "SUPER") {
          token.isSuperUser = true;
        }
      }

      return token;
    },
    async session({ session, token }) {
      console.log("Session callback with token:", { 
        sub: token.sub,
        role: token.role,
        teacherId: token.teacherId,
        studentId: token.studentId,
        isSuperUser: token.isSuperUser
      });
      
      if (token) {
        session.user.id = token.sub;
        session.user.role = token.role as Role;
        session.user.teacherId = token.teacherId;
        session.user.studentId = token.studentId;
        
        // Set isSuperUser flag in the session
        if (token.role === "SUPER" || token.isSuperUser) {
          session.user.isSuperUser = true;
        }
      }

      return session;
    },
  },
  events: {
    // Handle any missing teacher profile creation in the signIn event as a safety net
    async signIn({ user, account }) {
      try {
        // Update last login for students
        if (user.role === "STUDENT" && user.studentId) {
          await db.student.update({
            where: { id: user.studentId },
            data: { lastLogin: new Date() },
          });
        }

        // Safety check for teachers - ensure they have a teacher profile
        if (user.role === "TEACHER" && !user.teacherId) {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            include: { teacher: true },
          });

          // If user exists but teacher profile doesn't, create one
          if (dbUser && !dbUser.teacher) {
            const firstName =
              dbUser.name?.split(" ")[0] ||
              user.name?.split(" ")[0] ||
              user.email?.split("@")[0] ||
              "Teacher";
            const lastName =
              dbUser.name?.split(" ").slice(1).join(" ") ||
              user.name?.split(" ").slice(1).join(" ") ||
              "";

            await db.teacher.create({
              data: {
                userId: dbUser.id,
                firstName,
                lastName,
                bio: "",
                institution: "",
              },
            });
            console.log(
              `Created missing teacher profile during signIn event for user ${dbUser.id}`
            );
          }
        }
        
        // No special handling needed for SUPER users
      } catch (error) {
        console.error("Error in signIn event:", error);
        // Don't block the signin process if this fails
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};