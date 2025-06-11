import NextAuth, { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      role: Role;
      teacherId?: string | null;
      studentId?: string | null;
      firstName?: string | null; 
      lastName?: string | null; 
      email?: string | null;
      image?: string | null;
      isSuperUser?: boolean;
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User {
    id: string;
    role: Role;
    teacherId?: string;
    studentId?: string;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    sub: string;
    role?: Role;
    teacherId?: string | null;
    studentId?: string | null;
  }
}