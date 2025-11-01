"use client";

import { useState, useEffect, useMemo } from "react";
import { SidebarLeft } from "@/src/components/sidebar-left";
import { SidebarProvider, SidebarInset } from "@/src/components/ui/sidebar";
import { Toaster } from "@/src/components/ui/sonner";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import DashboardHeader from "@/src/components/dashboard/DashboardHeader";
import { HEADER_HEIGHT } from "@/src/lib/constants/header_height";
import { X, LogOut } from "lucide-react";
import { NavMain } from "@/src/components/nav-main";
import { NavLogo } from "@/src/components/nav-logo";
import { dashboardData } from "@/src/lib/constants/nav-data";

// Define a more specific type for session user to avoid TypeScript errors
type UserWithExtendedProfile = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
  teacherId?: string | null;
  studentId?: string | null;
  firstName?: string | null; 
  lastName?: string | null;
};

const getFilteredNavItems = (role: string, originalItems: any[]) => {
  if (role === "SUPER") {
    return originalItems.filter(item => 
      item.title === "Lesson Plans" || 
      item.url?.includes("lesson-plans")
    );
  }
  return originalItems;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL LOGIC
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [profileVersion, setProfileVersion] = useState(0);
  const [userData, setUserData] = useState<UserWithExtendedProfile | null>(null);
  const pathname = usePathname();
  
  const { data: session, status } = useSession({
    required: true,
  });

  // Fetch the teacher profile to get complete user data
  useEffect(() => {
    const fetchTeacherProfile = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch(`/api/teacher/profile?t=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserData({
            ...session.user,
            firstName: data.firstName,
            lastName: data.lastName,
            image: data.image || data.profileImage || (session.user as any)?.image || null
          });
        } else {
          setUserData(session.user as UserWithExtendedProfile);
        }
      } catch (error) {
        console.error('Error fetching teacher profile:', error);
        setUserData(session.user as UserWithExtendedProfile);
      }
    };
    
    if (session?.user) {
      fetchTeacherProfile();
    }
  }, [session, profileVersion]);

  // Update page title based on current path
  useEffect(() => {
    if (pathname.includes("/classes")) setPageTitle("Classes");
    // else if (pathname.includes("/calendar")) setPageTitle("Calendar");
    else if (pathname.includes("/bills")) setPageTitle("Bills");
    else if (pathname.includes("/bank-accounts")) setPageTitle("Bank Accounts");
    else if (pathname.includes("/lesson-plans")) setPageTitle("Lesson Plans");
    else if (pathname.includes("/storefront")) setPageTitle("Storefront");
    else setPageTitle("Dashboard");
  }, [pathname]);

  // Close mobile sidebar when clicking outside or navigating
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Listen for profile updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'profileUpdated') {
        setProfileVersion(v => v + 1);
      }
    };
    
    const handleProfileUpdated = () => {
      setProfileVersion(v => v + 1);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profileUpdated', handleProfileUpdated);
    
    const lastUpdate = localStorage.getItem('profileUpdated');
    if (lastUpdate) {
      setProfileVersion(v => v + 1);
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdated', handleProfileUpdated);
    };
  }, []);

  // Prepare user display name from profile or session data
  const getUserDisplayName = () => {
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    
    if (session?.user && (session.user as any)?.name) {
      return (session.user as any).name;
    }
    
    return "Teacher";
  };
  
  // Get teacher info for avatar
  const teacherName = getUserDisplayName() || "Teacher";
  const userInitials = useMemo(() => {
    const name = teacherName;
    const parts = (name || '').split(' ').filter((p: string) => p.length > 0);
    
    if (parts.length === 0) return 'T';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }, [teacherName]);
  
  // Safe image access with fallback
  const teacherImage = userData?.image || (session?.user as any)?.image || null;
  
  // Get filtered navigation items based on user role
  const filteredNavItems = getFilteredNavItems(
    session?.user?.role || "TEACHER", 
    dashboardData.navMain
  );

  const isCalendarPage = pathname.includes("/calendar");

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/teacher" });
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  // NOW HANDLE CONDITIONAL RENDERING AFTER ALL HOOKS
  // Add loading check to prevent prerender errors
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Add session check to prevent undefined access
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
      {/* Mobile/Tablet Sidebar Overlay - Show up to lg screens (1024px) */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}
      
      {/* Mobile/Tablet Sidebar - Show up to lg screens, responsive width */}
      <div 
        className={`fixed inset-y-0 left-0 bg-[#f1faf3] shadow-lg transform transition-transform duration-300 ease-in-out z-40 lg:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64 sm:w-72 md:w-80`}
      >
        <div className="h-full overflow-y-auto">
          {/* Close button - responsive sizing */}
          <button
            onClick={closeMobileSidebar}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-50"
            aria-label="Close sidebar"
            type="button"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
          </button>
          
          {/* Logo section - responsive spacing */}
          <div className="px-3 sm:px-4 pt-4 pb-2 border-b flex justify-center mt-8 sm:mt-10">
            <NavLogo items={dashboardData.dashLogo} />
          </div>
          
          {/* Navigation - responsive spacing */}
          <div className="px-1 sm:px-2 py-3 sm:py-4 space-y-1">
            <NavMain items={filteredNavItems} />
          </div>
        </div>
      </div>
      
      {/* Desktop Sidebar - Show on lg screens and above (1024px+) - iPad Pro and Desktop */}
      <div className="hidden lg:block">
        <SidebarLeft filteredNavItems={filteredNavItems} />
      </div>
      
      {/* Main content - Responsive margin adjustment */}
      <SidebarInset className={`relative flex flex-col h-screen ${
        // No left margin on mobile/tablet (up to lg), add margin on lg+ when desktop sidebar is visible
        'lg:ml-0'
      }`}>
        {/* Header Component */}
        <DashboardHeader
          pageTitle={pageTitle}
          teacherImage={teacherImage || ""}
          teacherInitial={userInitials}
          teacherName={teacherName}
          onLogout={handleLogout}
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          profileVersion={profileVersion}
        />
        
        {/* Main content area */}
        <div 
          className="flex-1 bg-gray-50 overflow-auto"
          style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)` }}
        >
          <div className={`mx-auto min-h-full ${
            isCalendarPage 
              ? 'p-0 max-w-none bg-gray-50' 
              : 'max-w-7xl px-2 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4 bg-gray-50'
          }`}>
            {children}
          </div>
        </div>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}