import type { NextAuthOptions } from "next-auth";
import type { User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/src/lib/db";
import bcrypt from "bcryptjs";

// Ensure db is properly initialized before using it
if (!db) {
  throw new Error("Database client is not initialized properly");
}

interface CustomUser extends User {
  firstName?: string;
  lastName?: string;
}

export const authOptions: NextAuthOptions = {
  // Only initialize the adapter when we're sure db is available
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt", // Use JWT instead of database sessions temporarily
  },
  debug: false,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account", // Always show account selection
          access_type: "offline",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          firstName: profile.given_name,
          lastName: profile.family_name,
          email: profile.email,
          image: profile.picture,
          role: "TEACHER",
        };
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        //Check for SUPER user credentials
        if (
          credentials.email === process.env.SUPER_USER_EMAIL &&
          credentials.password === process.env.SUPER_USER_PASSWORD
        ) {
          // Look for existing super user or create one if it doesn't exist
          let superUser = await db.user.findUnique({
            where: { email: credentials.email },
          });

          if (!superUser) {
            // Create the super user if it doesn't exist
            superUser = await db.user.create({
              data: {
                email: credentials.email,
                name: "Super Admin",
                firstName: "Super",
                lastName: "Admin",
                password: await bcrypt.hash(credentials.password, 10),
                role: "SUPER",
              },
            });
          } else if (superUser.role !== "SUPER") {
            // Upgrade to SUPER if exists but not SUPER yet
            superUser = await db.user.update({
              where: { id: superUser.id },
              data: { role: "SUPER" },
            });
          }

          return {
            id: superUser.id,
            email: superUser.email,
            name: superUser.name,
            role: "SUPER",
            image: superUser.image,
          };
        }

        // Check for teacher login credentials
        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (user?.password) {
          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (isValid) {
            return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "TEACHER" | "STUDENT" | "SUPER", // Cast to expected role type
    image: user.image,
  };
          }
        }

        // If teacher login fails, check for student login
        const student = await db.student.findUnique({
          where: { schoolEmail: credentials.email },
        });

        if (student?.password) {
          const isStudentValid = await bcrypt.compare(
            credentials.password,
            student.password
          );

          if (isStudentValid) {
            return {
              id: student.id,
              email: student.schoolEmail,
              name: `${student.firstName} ${student.lastName}`,
              role: "STUDENT",
              image: student.profileImage,
            };
          }
        }

        // If neither teacher nor student login succeeds, return null
        return null;
      },
    }),
  ],
  cookies: {
    sessionToken: {
      name: `${
        process.env.NODE_ENV === "production" ? "__Secure-" : ""
      }next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  events: {
    createUser: async ({ user }) => {
      // Create TeacherProfile for new users with TEACHER role
      try {
        if (user.role === "TEACHER") {
          const existingProfile = await db.teacherProfile.findUnique({
            where: { userId: user.id },
          });

          if (!existingProfile) {
            await db.teacherProfile.create({
              data: {
                userId: user.id,
                firstName:
                  (user as CustomUser).firstName ||
                  user.name?.split(" ")[0] ||
                  "",
                lastName:
                  (user as CustomUser).lastName ||
                  user.name?.split(" ").slice(1).join(" ") ||
                  "",
              },
            });
            console.log(`Created TeacherProfile for new user ${user.id}`);
          }
        }
      } catch (error) {
        console.error("Error in createUser event:", error);
      }
    },
    signIn: async ({ user }) => {
      // Check and create TeacherProfile on sign in if it doesn't exist
      try {
        if (user.role === "TEACHER") {
          const userWithProfile = await db.user.findUnique({
            where: { id: user.id },
            include: { teacherProfile: true },
          });

          if (userWithProfile && !userWithProfile.teacherProfile) {
            await db.teacherProfile.create({
              data: {
                userId: user.id,
                firstName:
                  (user as CustomUser).firstName ||
                  user.name?.split(" ")[0] ||
                  "",
                lastName:
                  (user as CustomUser).lastName ||
                  user.name?.split(" ").slice(1).join(" ") ||
                  "",
              },
            });
            console.log(
              `Created TeacherProfile for existing user ${user.id} on sign in`
            );
          }
        }
      } catch (error) {
        console.error("Error in signIn event:", error);
      }
    },
    signOut: async ({ token, session }) => {
      try {
        if (token?.id) {
          // For JWT strategy, we need to clean up any related Account entries
          if (token.email) {
            // If there are any expired tokens or session-related data in Account
            // that needs cleaning, you can handle it here
            await db.account.updateMany({
              where: { 
                userId: token.id,
                // Only update session-related fields when cleaning up
                OR: [
                  { expires_at: { lt: Math.floor(Date.now() / 1000) } }
                ]
              },
              data: {
                // Reset any dynamic session data if needed
                session_state: null
              }
            });
          }

          // Clear any server-side session data
          if (session) {
            Object.keys(session).forEach(key => {
              // @ts-ignore - We need to clear all session properties
              session[key] = null;
            });
          }
        }
      } catch (error) {
        console.error("Error during sign out cleanup:", error);
      }
    },
  },
  callbacks: {
    async jwt({ token, user, account, profile, trigger }) {
      // Clear any previous identity if we're starting a new sign in
      if (account?.provider === 'google') {
        // Reset token to avoid any previous session conflicts
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
      } else if (user) {
        // Normal sign-in flow for other methods
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "TEACHER" | "STUDENT" | "SUPER";
      }

      // Update last login timestamp for students on session creation
      if (session?.user?.role === "STUDENT" && session.user.email) {
        try {
          await db.student.updateMany({
            where: { schoolEmail: session.user.email },
            data: { lastLogin: new Date() }
          });
        } catch (error) {
          console.error("Failed to update student last login:", error);
        }
      }

      return session;
    },
    
    async signIn({ user, account, profile }) {
      // For OAuth providers, ensure account linking works properly
      if (account?.provider === "google") {
        try {
          // First check if this Google account is already linked to a user
          const linkedAccount = await db.account.findFirst({
            where: { 
              provider: 'google',
              providerAccountId: account.providerAccountId
            },
            include: {
              user: true
            }
          });
          
          // If this Google account is already linked, return true to complete sign-in
          if (linkedAccount) {
            return true;
          }
          
          // Check if we have a user with this email
          const userWithEmail = await db.user.findUnique({
            where: { 
              email: user.email as string 
            }
          });
          
          // If no user with this email exists, let NextAuth create a new user
          if (!userWithEmail) {
            return true;
          }
          
          // If user exists with this email but no linked Google account,
          // manually create the account link
          await db.account.create({
            data: {
              userId: userWithEmail.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            }
          });
          
          // Also ensure teacher profile exists
          const teacherProfile = await db.teacherProfile.findUnique({
            where: { userId: userWithEmail.id }
          });
          
          if (!teacherProfile) {
            await db.teacherProfile.create({
              data: {
                userId: userWithEmail.id,
                firstName: userWithEmail.firstName || (profile as any)?.given_name || "",
                lastName: userWithEmail.lastName || (profile as any)?.family_name || "",
              }
            });
          }
          
          // Notify sign-in to use the existing user
          return true;
        } catch (error) {
          console.error("Error in OAuth sign-in flow:", error);
          return true; // Still allow sign-in even if our extra logic fails
        }
      }
      return true;
    }
  },
  
  // Clear all sessions during sign out
  // events: {
  //   signOut: async ({ token, session }) => {
  //     try {
  //       if (token?.id) {
  //         // For JWT strategy, we need to clean up any related Account entries
  //         if (token.email) {
  //           // If there are any expired tokens or session-related data in Account
  //           // that needs cleaning, you can handle it here
  //           await db.account.updateMany({
  //             where: { 
  //               userId: token.id,
  //               // Only update session-related fields when cleaning up
  //               OR: [
  //                 { expires_at: { lt: Math.floor(Date.now() / 1000) } }
  //               ]
  //             },
  //             data: {
  //               // Reset any dynamic session data if needed
  //               session_state: null
  //             }
  //           });
  //         }

  //         // Clear any server-side session data
  //         if (session) {
  //           Object.keys(session).forEach(key => {
  //             // @ts-ignore - We need to clear all session properties
  //             session[key] = null;
  //           });
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error during sign out cleanup:", error);
  //     }
  //   },
  // },
  
  // Add pages configuration to customize error and sign-in pages
  pages: {
    signIn: '/teacher', 
    error: '/auth/error',
    signOut: '/teacher'
  }
}