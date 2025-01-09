import React from 'react';

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function Dashboard({ children }: { children: React.ReactNode }) {
    return(
        <>

            <header>
            <div className="min-h-screen flex flex-col gap-16 min-h-0">
                <h1 className="bg-gray-800 text-white p-4">
                    Teacher's Dashboard (Child component)
                    </h1>
                </div>
                </header>

        </>
    );
    
}

{/* <SidebarProvider>
                <AppSidebar />
                <main>
                <SidebarTrigger />
                {children}
                </main>
            </SidebarProvider> */}

        //     <SidebarProvider defaultOpen={true}>
        //     <AppSidebar />
        //     <main>
        //         <SidebarTrigger />
        //         {children}
        //     </main>
        // </SidebarProvider>