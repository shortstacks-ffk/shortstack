"use client"

import * as React from "react"
import {
  Calendar,
  Home,
  SquarePen,
  LogOut,
  Landmark, 
  ReceiptText, 
  ShoppingBag, 
  BookOpen,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { NavMain } from "@/src/components/nav-main"
import { NavLogo } from "@/src/components/nav-logo"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/src/components/ui/sidebar"

import mascot from '../../public/assets/img/Mascout 9ldpi.png'
import simple_logo from '../../public/assets/img/logo simple - greenldpi.png'

const data = {
  dashLogo: [{
    title: simple_logo,
    url: "/teacher/dashboard",
    icon: mascot,
  }],
  navMain: [
    {
      title: "Home",
      url: "/teacher/dashboard",
      icon: Home,
    },
    {
      title: "Classes",
      url: "/teacher/dashboard/classes",
      icon: SquarePen,
    },
    {
      title: "Calendar",
      url: "/teacher/dashboard/calendar",
      icon: Calendar,
    },
    {
      title: "Bank Accounts",
      url: "/teacher/dashboard/bank-accounts",
      icon: Landmark,
    },
    {
      title: "Bills",
      url: "/teacher/dashboard/bills",
      icon: ReceiptText,
    },
    {
      title: "Storefront",
      url: "/teacher/dashboard/storefront",
      icon: ShoppingBag,
    },
    {
      title: "Lesson Plans",
      url: "/teacher/dashboard/lesson-plans",
      icon: BookOpen,
    },
  ],
}

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/teacher');
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out");
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0" {...props}>
      <SidebarHeader className="items-center mb-4">
        <NavLogo items={data.dashLogo} />
      </SidebarHeader>
      <SidebarContent className="pl-4 pt-10 mb-4 flex flex-col">
        {/* Wrap NavMain in a div with the spacing class */}
        <div className="space-y-6">
          <NavMain items={data.navMain} />
        </div>
        
        {/* Add Spacer to push logout to bottom */}
        {/* <div className="flex-grow min-h-[20px] mt-6"></div> */}
        
        {/* Logout Button */}
        {/* <div className="px-2 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-2 py-2 w-full text-left text-gray-700 rounded-md hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div> */}
      </SidebarContent>
      <SidebarFooter>
        <SidebarTrigger />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
