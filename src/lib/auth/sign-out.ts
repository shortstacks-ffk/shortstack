"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Performs a complete sign out by:
 * 1. Clearing cookies via the API endpoint
 * 2. Using NextAuth's signOut function
 * 3. Optionally redirecting the user
 */
export async function signOutCompletely(redirectUrl = "/teacher") {
  try {
    // First clear server-side cookies
    await fetch("/api/auth/clear-session", { 
      method: "GET", 
      credentials: "include"
    });
    
    // Clear any client-side storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Then perform NextAuth signOut
    await nextAuthSignOut({ 
      callbackUrl: redirectUrl,
      redirect: true
    });
    
    return true;
  } catch (error) {
    console.error("Error during sign out:", error);
    // Fall back to standard sign-out if complete method fails
    await nextAuthSignOut({ redirect: true, callbackUrl: redirectUrl });
    return false;
  }
}