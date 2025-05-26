import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar";
import TeacherCalendarClient from "./TeacherCalendarClient";
import { Suspense } from "react";

export default function CalendarPage() {
  return (
    <SidebarProvider>
      {/* Remove any padding classes that might be adding space */}
      <SidebarInset className="h-full">
        {/* Remove all padding and margins, full bleed */}
        <div className="h-full">
          <Suspense fallback={
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin h-6 w-6 border-3 border-orange-500 border-t-transparent rounded-full"></div>
            </div>
          }>
            <TeacherCalendarClient />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}