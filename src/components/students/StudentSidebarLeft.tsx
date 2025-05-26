"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/src/hooks/use-toast";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Home, SquarePen, Calendar, Wallet, ShoppingBag, X, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import Image from "next/image";
import { cn } from "@/src/lib/utils";
import { usePathname } from "next/navigation";
import { NavLogo } from "@/src/components/nav-logo";
import { studentDashboardData } from "@/src/lib/constants/nav-data";

// Add props interface to receive mobile state
interface DashboardSidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function StudentSidebarLeft({ isMobileOpen, setIsMobileOpen }: DashboardSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { href: "/student/dashboard", icon: Home, label: "Dashboard", exact: true },
    { href: "/student/dashboard/classes", icon: SquarePen, label: "Classes" },
    { href: "/student/dashboard/calendar", icon: Calendar, label: "Calendar" },
    { href: "/student/dashboard/bank", icon: Wallet, label: "Bank" },
    { href: "/student/dashboard/storefront", icon: ShoppingBag, label: "Storefront" },
  ];
  
  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/student');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "There was a problem logging you out",
        variant: "destructive"
      });
    }
  };

  // Check if a nav item is active
  const isNavItemActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MOBILE SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#f1faf3] z-50 transform transition-transform duration-300
          md:hidden
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-full overflow-y-auto">
          {/* Close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-50"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>

          {/* Navigation header - Add logo */}
          <div className="flex items-center justify-center p-4 border-b mt-10">
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
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout button */}
          <div className="absolute bottom-4 left-0 right-0 px-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 w-full text-left text-red-600 rounded-md hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden md:flex md:flex-col bg-[#f1faf3] border-r transition-all duration-300 h-full
          ${isCollapsed ? "md:w-16" : "md:w-64"}
        `}
      >
        {/* Collapse button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-16 p-1 bg-white rounded-full border shadow-sm z-10"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Content */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`px-4 py-4 border-b flex ${isCollapsed ? "justify-center" : ""}`}>
            {isCollapsed ? (
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
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-5 w-5" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="px-3 py-4 border-t">
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 px-3 py-2 w-full text-left rounded-md hover:bg-red-50",
                isCollapsed ? "justify-center" : ""
              )}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogOut className="h-5 w-5 text-red-600" />
              {!isCollapsed && <span className="text-red-600">Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}