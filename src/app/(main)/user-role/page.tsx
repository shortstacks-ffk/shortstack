"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Create a client component that uses useSearchParams
function UserRoleSelector() {
  const searchParams = useSearchParams();
  const action = searchParams.get("action") || "signin"; // Default to signin
  
  const isSignIn = action === "signin";
  // Define the paths based on the action
  const teacherPath = isSignIn ? "/teacher" : "/register";
  const studentPath = isSignIn ? "/student" : "/student"; // Students only have sign in

  return (
    <div className="flex gap-8 w-full max-w-4xl justify-center">
      <Link
        href={teacherPath}
        className="w-full max-w-md text-center py-4 px-8 bg-[#99D420] hover:bg-[#89C410] text-white text-2xl font-semibold rounded-full transition-colors"
      >
        Teacher
      </Link>
      <Link
        href={studentPath}
        className="w-full max-w-md text-center py-4 px-8 bg-[#99D420] hover:bg-[#89C410] text-white text-2xl font-semibold rounded-full transition-colors"
      >
        Student
      </Link>
    </div>
  );
}

// Fallback component to show while loading
function UserRoleSelectorFallback() {
  return (
    <div className="flex gap-8 w-full max-w-4xl justify-center">
      <div className="w-full max-w-md text-center py-4 px-8 bg-gray-300 text-white text-2xl font-semibold rounded-full">
        Loading...
      </div>
      <div className="w-full max-w-md text-center py-4 px-8 bg-gray-300 text-white text-2xl font-semibold rounded-full">
        Loading...
      </div>
    </div>
  );
}

// Main page component
export default function UserRolePage() {
  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex flex-col items-center justify-center min-h-[calc(80vh-78px)]">
        <h1 className="text-[54px] font-bold mb-6">Welcome to ShortStacks</h1>
        <p className="text-[36px] mb-32">Welcome to Financial Freedom</p>

        <h2 className="text-[36px] mb-10">Are you a Teacher or a Student?</h2>

        <Suspense fallback={<UserRoleSelectorFallback />}>
          <UserRoleSelector />
        </Suspense>
      </div>
    </div>
  );
}
