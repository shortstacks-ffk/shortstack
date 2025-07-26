"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/src/components/ui/sidebar";
import { Toaster } from "@/src/components/ui/sonner";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { HEADER_HEIGHT } from "@/src/lib/constants/header_height";
import { X, Home, SquarePen, Calendar, Wallet, ShoppingBag, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import StudentDashboardHeader from "@/src/components/dashboard/StudentDashboardHeader";
import { cn } from "@/src/lib/utils";

// Import NavLogo component to keep branding consistent
import { NavLogo } from "@/src/components/nav-logo";
// Get the dashboard navigation data from shared source
import { studentDashboardData } from "@/src/lib/constants/nav-data";

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  // ALL HOOKS MUST BE AT THE TOP
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [studentData, setStudentData] = useState<any>(null);
  const pathname = usePathname();
  
  const { data: session, status } = useSession({
    required: true,
  });

  // Fetch student profile data
  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (session?.user && session.user.role === "STUDENT") {
        try {
          const response = await fetch('/api/student/profile?t=' + new Date().getTime(), {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("Student profile data:", data);
            setStudentData(data);
          } else {
            console.error("Failed to fetch student profile:", await response.text());
          }
        } catch (error) {
          console.error("Failed to fetch student profile:", error);
        }
      }
    };
    
    fetchStudentProfile();
  }, [session]);

  // Update page title based on current path
  useEffect(() => {
    if (pathname.includes("/classes")) setPageTitle("Classes");
    else if (pathname.includes("/account")) setPageTitle("Account");
    else if (pathname.includes("/assignments")) setPageTitle("Assignments");
    // else if (pathname.includes("/calendar")) setPageTitle("Calendar");
    else if (pathname.includes("/bank")) setPageTitle("Bank");
    else if (pathname.includes("/storefront")) setPageTitle("Storefront");
    else setPageTitle("Dashboard");
  }, [pathname]);

  // Close mobile sidebar when clicking outside or navigating
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Navigation items
  const navItems = [
    { href: "/student/dashboard", icon: Home, label: "Dashboard", exact: true },
    { href: "/student/dashboard/classes", icon: SquarePen, label: "Classes" },
    // { href: "/student/dashboard/calendar", icon: Calendar, label: "Calendar" },
    { href: "/student/dashboard/bank", icon: Wallet, label: "Bank" },
    { href: "/student/dashboard/storefront", icon: ShoppingBag, label: "Storefront" },
  ];

  // Helper functions
  const getStudentInitials = (student: any) => {
    if (!student) return 'ST';
    const firstName = student.firstName || '';
    const lastName = student.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const getStudentName = (student: any) => {
    if (!student) return 'Student';
    if (student.firstName && student.lastName) {
      return `${student.firstName} ${student.lastName}`;
    }
    return 'Student';
  };

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/student" });
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };
  
  // Check if a nav item is active
  const isNavItemActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  
  const isCalendarPage = pathname.includes("/calendar");

  // Get student info for header
  const studentName = getStudentName(studentData || session?.user);
  const studentInitials = getStudentInitials(studentData || session?.user);
  const studentEmail = studentData?.schoolEmail || session?.user?.email || '';

  // Loading check after all hooks
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Please sign in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      {/* Mobile Sidebar Overlay - Show on tablets too */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}
      
      {/* Mobile Sidebar - Show on tablets too */}
      <div 
        className={`fixed inset-y-0 left-0 w-72 bg-[#f1faf3] shadow-lg transform transition-transform duration-300 ease-in-out z-40 lg:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto">
          {/* X close button */}
          <button
            onClick={closeMobileSidebar}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-50"
            aria-label="Close sidebar"
            type="button"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
          
          {/* Mobile NavLogo with padding to avoid overlap with close button */}
          <div className="px-4 pt-4 pb-2 flex justify-center mt-10">
            <NavLogo items={studentDashboardData.dashLogo} />
          </div>
          
          {/* Navigation items */}
          <nav className="mt-6 px-3">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                      isNavItemActive(item.href, item.exact)
                        ? "bg-[#c2e8cf] text-gray-800 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={closeMobileSidebar}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      
      {/* Desktop Sidebar - Only show on large screens */}
      <aside
        className={`hidden lg:flex lg:flex-col bg-[#f1faf3] border-r transition-all duration-300 h-full fixed top-0 left-0
          ${isDesktopSidebarCollapsed ? "w-16" : "w-64"}
        `}
      >
        {/* Collapse button */}
        <button
          onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
          className="absolute bottom-4 right-4"
          aria-label={isDesktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isDesktopSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Content */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`px-4 py-4 flex ${isDesktopSidebarCollapsed ? "justify-center" : ""}`}>
            {isDesktopSidebarCollapsed ? (
              <div className="flex justify-center">
                <Image
                  src="/assets/img/Mascout 9ldpi.png"
                  alt="ShortStacks Mascot"
                  width={32}
                  height={32}
                  className="mascot-image"
                />
              </div>
            ) : (
              <NavLogo items={studentDashboardData.dashLogo} />
            )}
          </div>

          {/* Navigation */}
          <nav className="mt-6 px-3 flex-1">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                      isNavItemActive(item.href, item.exact)
                        ? "bg-[#c2e8cf] text-gray-800 font-medium"
                        : "text-gray-700 hover:bg-green-100"
                    )}
                    title={isDesktopSidebarCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-5 w-5" />
                    {!isDesktopSidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>
      
      {/* Main content - Apply margin only on large screens */}
      <SidebarInset className={`relative flex flex-col h-screen ${
        isDesktopSidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
      }`}>
        {/* Header Component */}
        <StudentDashboardHeader
          pageTitle={pageTitle}
          studentImage={studentData?.profileImage || null}
          studentInitials={studentInitials}
          studentName={studentName}
          studentEmail={studentEmail}
          onLogout={handleLogout}
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        
        {/* Main content area */}
        <div 
          className="bg-gray-50 flex-1 overflow-y-auto"
          style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)` }}
        >
          <div className={`mx-auto w-full ${isCalendarPage ? 'p-0 max-w-none' : 'max-w-7xl px-2 sm:px-4 md:px-6 py-2 md:py-4'}`}>
            {children}
          </div>
        </div>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}