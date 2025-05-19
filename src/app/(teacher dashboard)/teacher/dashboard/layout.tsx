"use client";

import { useState, useEffect } from "react";
import { SidebarLeft } from "@/src/components/sidebar-left";
import { SidebarProvider, SidebarInset } from "@/src/components/ui/sidebar";
import { Toaster } from "@/src/components/ui/sonner";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import DashboardHeader from "@/src/components//dashboard/DashboardHeader";
import { HEADER_HEIGHT } from "@/src/lib/constants/header_height";

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
  
  return (
    <SidebarProvider>
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 w-64 bg-sidebar transform transition-transform duration-200 ease-in-out z-40 md:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto">
          <SidebarLeft />
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
        
        {/* Main content - exact height calculation */}
        <div 
          className="bg-gray-50 flex-1 overflow-hidden" 
          style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)` }}
        >
          {children}
        </div>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}