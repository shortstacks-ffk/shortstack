import { NextResponse, NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { getToken } from "next-auth/jwt";
import { NextFetchEvent } from "next/server";

// Routes that should use NextAuth.js instead of Clerk
const isNextAuthRoute = createRouteMatcher([
  '/student(.*)',
  '/api/student/(.*)', 
  '/api/auth/(.*)'
]);

// Standalone NextAuth middleware function
async function handleNextAuthRoutes(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Check if NEXTAUTH_SECRET is set
  if (!process.env.NEXTAUTH_SECRET) {
    console.error("NEXTAUTH_SECRET is not set. Authentication will fail.");
  }
  
  // Protected student routes - require NextAuth.js authentication
  if (pathname.startsWith("/student/dashboard") || pathname.startsWith("/api/student/")) {
    try {
      const token = await getToken({ 
        req,
        secret: process.env.NEXTAUTH_SECRET
      });
      
      // Debug logging (remove in production)
      console.log(`Auth check for ${pathname}:`, token ? `Authenticated as ${token.role}` : "Not authenticated");
      
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
    } catch (error) {
      console.error("Authentication error:", error);
      // For API routes, return 500 instead of redirecting
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Authentication error" }, { status: 500 });
      }
      
      return NextResponse.redirect(new URL("/student?error=auth_error", req.url));
    }
  }
  
  // Redirect authenticated students away from login page
  if (pathname === "/student") {
    try {
      const token = await getToken({ 
        req,
        secret: process.env.NEXTAUTH_SECRET
      });
      
      if (token && token.role === "student") {
        return NextResponse.redirect(new URL("/student/dashboard", req.url));
      }
    } catch (error) {
      console.error("Error checking authentication at login page:", error);
      // Allow user to proceed to login page on error
    }
  }
  
  return NextResponse.next();
}

// Main middleware function
export async function middleware(req: NextRequest, event: NextFetchEvent) {
  // For NextAuth student routes, use NextAuth middleware
  if (isNextAuthRoute(req)) {
    return handleNextAuthRoutes(req);
  }
  
  // For all other routes, use Clerk middleware
  // Pass both request and event to clerkMiddleware
  return clerkMiddleware()(req, event);
}

// Apply middleware to all routes except static assets and special paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the following:
     * - Static files (.+\.[\\w]+$)
     * - API routes that don't match NextAuth patterns
     * - _next/static (Next.js static files)
     * - _next/image (Next.js image optimization files)
     * - favicon.ico (Browser favicon)
     */
    '/((?!_next/static|_next/image|favicon.ico|.+\\.[\\w]+$).*)',
    '/api/((?!_health).*)',
  ],
};