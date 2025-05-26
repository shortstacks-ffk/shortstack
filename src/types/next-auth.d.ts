import NextAuth from "next-auth";
import { User as NextAuthUser } from "next-auth";

declare module "next-auth" {
  interface User extends NextAuthUser {
    id: string;
    firstName?: string;
    lastName?: string;
    role: "TEACHER" | "STUDENT" | "SUPER";
  }

  interface Session {
    user: User & {
      id: string;
      role: "TEACHER" | "STUDENT" | "SUPER";
    };
  }
  
  interface JWT {
    role?: "TEACHER" | "STUDENT" | "SUPER";
  }
}