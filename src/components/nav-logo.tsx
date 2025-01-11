"use client"

import Image, { StaticImageData } from "next/image"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavLogo({
  items,
}: {
  items: {
    title: StaticImageData,
    url: string,
    icon: StaticImageData,
  }[]
}) {
  return (
    <SidebarMenu>
      {items.map((item, index) => (
        <SidebarMenuItem key={index}>
          <SidebarMenuButton asChild>
            <a href={item.url} className="flex items-center">
              <Image 
                src={item.icon} 
                alt="Icon" 
                width={35} 
                height={35} 
              />
              <Image 
                src={item.title} 
                alt="Title" 
                width={110} 
                height={100} 
              />
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
