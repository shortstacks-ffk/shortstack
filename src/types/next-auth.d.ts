import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "TEACHER" | "STUDENT";
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "TEACHER" | "STUDENT";
  }
}