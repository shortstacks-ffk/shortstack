import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = cookies();
  
  // List of cookies to clear
  const cookiesToClear = [
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.pkce.code_verifier',
    '__Secure-next-auth.session-token',
    '__Secure-next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
  ];
  
  // Create response
  const response = NextResponse.json({ 
    success: true, 
    message: "Auth session cleared" 
  });
  
  // Clear all auth cookies
  cookiesToClear.forEach(name => {
    response.cookies.delete(name);
  });
  
  return response;
}