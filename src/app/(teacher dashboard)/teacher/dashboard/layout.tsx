"use client";

import { useState, useEffect } from "react";
import { SidebarLeft } from "@/src/components/sidebar-left";
import { SidebarProvider, SidebarInset } from "@/src/components/ui/sidebar";
import { Toaster } from "@/src/components/ui/sonner";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import DashboardHeader from "@/src/components/dashboard/DashboardHeader";
import { HEADER_HEIGHT } from "@/src/lib/constants/header_height";
import { X, LogOut } from "lucide-react";
import { NavMain } from "@/src/components/nav-main";
import Link from "next/link";

// Import NavLogo component to keep branding consistent
import { NavLogo } from "@/src/components/nav-logo";
// Get the dashboard navigation data from shared source 
import { dashboardData } from "@/src/lib/constants/nav-data";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const pathname = usePathname();
  
  const { data: session } = useSession({
    required: true,
  });
  
  // Get teacher info for avatar
  const teacherName =
    session?.user?.name ||
    `${session?.user?.firstName || ""} ${session?.user?.lastName || ""}`.trim() ||
    "Teacher";
  const teacherInitial = teacherName.charAt(0);
  const teacherImage = session?.user?.image;
  
  // Update page title based on current path
  useEffect(() => {
    if (pathname.includes("/calendar")) setPageTitle("Calendar");
    else if (pathname.includes("/classes")) setPageTitle("Classes");
    else if (pathname.includes("/bills")) setPageTitle("Bills");
    else if (pathname.includes("/bank-accounts")) setPageTitle("Bank Accounts");
    else if (pathname.includes("/lesson-plans")) setPageTitle("Lesson Plans");
    else if (pathname.includes("/storefront")) setPageTitle("Storefront");
    else setPageTitle("Dashboard");
  }, [pathname]);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/teacher" });
  };

  // Close mobile sidebar when clicking outside or navigating
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Close sidebar function
  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };
  
  // Find the main content area div and update it for calendar pages:
  const isCalendarPage = pathname.includes("/calendar");
  
  return (
    <SidebarProvider>
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}
      
      {/* Mobile Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 w-72 bg-[#f1faf3] shadow-lg transform transition-transform duration-300 ease-in-out z-40 md:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto">
          {/* X close button - positioned with higher z-index and better separation */}
          <button
            onClick={closeMobileSidebar}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-50"
            aria-label="Close sidebar"
            type="button"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
          
          {/* Mobile NavLogo with padding to avoid overlap with close button */}
          <div className="px-4 pt-4 pb-2 border-b flex justify-center mt-10">
            <NavLogo items={dashboardData.dashLogo} />
          </div>
          
          {/* Mobile teacher profile info */}
          {/* <div className="px-4 py-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                {teacherImage ? (
                  <img 
                    src={teacherImage} 
                    alt={teacherName} 
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span>{teacherInitial}</span>
                )}
              </div>
              <div>
                <p className="font-medium">{teacherName}</p>
                <p className="text-sm text-gray-500">Teacher Dashboard</p>
              </div>
            </div>
          </div> */}
          
          {/* Mobile Navigation */}
          <div className="px-2 py-4 space-y-1">
            <NavMain items={dashboardData.navMain} />
            
            {/* Logout Button */}
            {/* <div className="mt-6 px-2">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div> */}
          </div>
        </div>
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <SidebarLeft />
      </div>
      
      <SidebarInset className="relative flex flex-col h-screen">
        {/* Header Component */}
        <DashboardHeader
          pageTitle={pageTitle}
          teacherImage={teacherImage || ""}
          teacherInitial={teacherInitial}
          teacherName={teacherName}
          onLogout={handleLogout}
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        
        {/* Main content area */}
        <div 
          className={`bg-gray-50 flex-1 overflow-y-auto`}
          style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)` }}
        >
          {/* Apply different styles based on page type */}
          <div className={`mx-auto w-full ${isCalendarPage ? 'p-0 max-w-none' : 'max-w-7xl px-2 sm:px-4 md:px-6 py-2 md:py-4'}`}>
            {children}
          </div>
        </div>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}