"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function ForceSignOut() {
  useEffect(() => {
    // Clear all auth state
    async function clearAuth() {
      try {
        // Clear localStorage
        localStorage.clear();
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Sign out from NextAuth to clear server-side session
        await signOut({ redirect: false });
        
        // Reload the page to apply all changes
        window.location.href = "/";
      } catch (error) {
        console.error("Error during sign out:", error);
      }
    }
    
    clearAuth();
  }, []);
  
  return <div>Signing you out...</div>;
}