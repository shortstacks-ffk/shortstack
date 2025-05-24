import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { Menu } from "lucide-react";
import StudentUserDropdown from "./StudentUserDropdown";

interface StudentDashboardHeaderProps {
  pageTitle: string;
  studentImage: string | null | undefined;
  studentInitials: string;
  studentName: string;
  studentEmail: string;
  onLogout: () => void;
  onMobileMenuToggle: () => void;
}

export default function StudentDashboardHeader({
  pageTitle,
  studentImage,
  studentInitials,
  studentName,
  studentEmail,
  onLogout,
  onMobileMenuToggle
}: StudentDashboardHeaderProps) {
  return (
    <header className="bg-white border-b sticky top-0 z-20 px-4 py-3 flex items-center justify-between shadow-sm">
      {/* Left side - Title and mobile menu button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="p-1.5 rounded-md hover:bg-gray-100 md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
      </div>
      
      {/* Right side - User dropdown */}
      <div className="flex items-center gap-3">
        <StudentUserDropdown
          studentImage={studentImage}
          studentInitials={studentInitials}
          studentName={studentName}
          studentEmail={studentEmail}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}