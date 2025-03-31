import { NextResponse, NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { getToken } from "next-auth/jwt";
import { createRouteMatcher } from "@clerk/nextjs/server";

// Routes that should use NextAuth.js instead of Clerk
const isNextAuthRoute = createRouteMatcher([
  '/student(.*)',
  '/api/student/(.*)', 
  '/api/auth/(.*)'
]);

// Standalone NextAuth middleware function
async function handleNextAuthRoutes(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Protected student routes - require NextAuth.js authentication
  if (pathname.startsWith("/student/dashboard") || pathname.startsWith("/api/student/")) {
    const token = await getToken({ 
      req,
      // Use a proper secret - it should be the same as in your [...nextauth] route
      secret: process.env.NEXTAUTH_SECRET || ""
    });
    
    // Redirect unauthenticated users to student login
    if (!token || token.role !== "student") {
      // For API routes, return 401 instead of redirecting
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      const url = new URL("/student", req.url);
      url.searchParams.set("callbackUrl", encodeURI(pathname));
      return NextResponse.redirect(url);
    }
  }
  
  // Redirect authenticated students away from login page
  if (pathname === "/student") {
    const token = await getToken({ 
      req,
      secret: process.env.NEXTAUTH_SECRET || ""
    });
    
    if (token && token.role === "student") {
      return NextResponse.redirect(new URL("/student/dashboard", req.url));
    }
  }
  
  return NextResponse.next();
}

// Main middleware function
export async function middleware(req: NextRequest) {
  // For NextAuth student routes, use NextAuth middleware
  if (isNextAuthRoute(req)) {
    return handleNextAuthRoutes(req);
  }
  
  // For all other routes, use Clerk middleware
  return clerkMiddleware(req, {} as any);
}

// Apply middleware to all routes except static assets
export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)',
    '/(api|trpc)(.*)',
  ],
};