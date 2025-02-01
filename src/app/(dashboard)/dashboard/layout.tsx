"use client"
import { SidebarLeft } from "@/src/components/sidebar-left"
// import { SidebarRight } from "@/src/components/sidebar-right"
import { SidebarProvider, SidebarInset } from "@/src/components/ui/sidebar"
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from "next/font/google"
import "@/src/app/globals.css"



const inter = Inter({ subsets: ["latin"] })

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
    <html lang="en">
      <body className={`${inter.className}`}>
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        {children}
      </SidebarInset>
      {/* <SidebarRight /> */}
    </SidebarProvider>
    </body>
    </html>
    </ClerkProvider>
  )
}