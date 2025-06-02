"use client"

import { type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/components/ui/sidebar"

export function NavMain({
  items, 
  className,
  currentPath
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
  }[]
  className?: string
  currentPath?: string
}) {
  const pathname = usePathname()
  const activePath = currentPath || pathname
  
  // Check if a nav item should be active - consider it active if the path starts with the item URL
  const isItemActive = (itemUrl: string) => {
    if (itemUrl === "/teacher/dashboard") {
      return activePath === "/teacher/dashboard"
    }
    return activePath.startsWith(itemUrl)
  }
  
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={isItemActive(item.url)}>
            <Link href={item.url}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
