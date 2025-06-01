"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

// Create a separate component that uses useSearchParams
function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  
  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
      
      <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded">
        <p className="text-sm text-gray-700">
          {error === "OAuthAccountNotLinked" 
            ? "This email is already associated with a different sign-in method." 
            : `Error: ${error || "Unknown authentication error"}`}
        </p>
      </div>
      
      <div className="mt-6 space-y-4">
        <Link 
          href="/api/auth/clear-session" 
          className="block w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white text-center rounded-md"
        >
          Reset Authentication State
        </Link>
        
        <Link 
          href="/teacher" 
          className="block w-full py-2 px-4 border border-gray-300 hover:bg-gray-50 text-center rounded-md"
        >
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}

// Loading fallback component
function AuthErrorLoading() {
  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-600 mb-4">Loading...</h1>
      <div className="mb-4 p-4 bg-gray-50 border border-gray-100 rounded animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
      <div className="mt-6 space-y-4">
        <div className="w-full py-2 px-4 bg-gray-200 rounded-md h-10 animate-pulse"></div>
        <div className="w-full py-2 px-4 bg-gray-100 border border-gray-200 rounded-md h-10 animate-pulse"></div>
      </div>
    </div>
  );
}

// Main component wrapped with Suspense
export default function AuthError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Suspense fallback={<AuthErrorLoading />}>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}