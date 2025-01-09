import { cookies } from "next/headers"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true"

  return (
    <html lang="en">   
        <body>
        <SidebarProvider defaultOpen={defaultOpen}>
        <header>
            <div className="min-h-screen flex flex-col gap-16 min-h-0">
                <h1 className="bg-gray-800 text-white p-4">
                    Teacher's Dashboard
                    </h1>
                </div>
        </header>  
      <AppSidebar />
      <main>
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
        </body>
    </html>
    
  )
}
