import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

// Paths that require student authentication
const STUDENT_PROTECTED_PATHS = [
  '/student/dashboard',
  '/student/dashboard/classes'
];

// Paths that should redirect logged-in students
const STUDENT_AUTH_PATHS = [
  '/student'
];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Handle student routes
  if (pathname.startsWith('/student')) {
    const studentAuthToken = request.cookies.get('student-auth-token')?.value;
    const isProtectedStudentPath = STUDENT_PROTECTED_PATHS.some(path => 
      pathname.startsWith(path)
    );
    const isStudentAuthPath = STUDENT_AUTH_PATHS.some(path => 
      pathname === path
    );
    
    // Redirect to login if trying to access protected pages without token
    if (isProtectedStudentPath && !studentAuthToken) {
      return NextResponse.redirect(new URL('/student', request.url));
    }
    
    // Redirect to dashboard if already logged in and trying to access login page
    if (isStudentAuthPath && studentAuthToken) {
      try {
        return NextResponse.redirect(new URL('/student/dashboard', request.url));
      } catch (error) {
        // If token is invalid, let them access the login page
      }
    }
    
    return NextResponse.next();
  }
  
  // For all other routes, let Clerk handle authentication
  const { userId } = getAuth(request);
  
  // Check if the current path requires teacher authentication
  const isTeacherPath = pathname.startsWith('/dashboard');
  
  if (isTeacherPath && !userId) {
    return NextResponse.redirect(new URL('/teacher/login', request.url));
  }
  
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};