import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar";
import TeacherCalendarClient from "./TeacherCalendarClient";
import { TodoSidebar } from "@/src/components/todo-sidebar";

export default function CalendarPage() {
  return (
    <SidebarProvider>
      <SidebarInset>
        <div className="p-2 lg:p-4">
          <TeacherCalendarClient />
        </div>
      </SidebarInset>
      <TodoSidebar />
    </SidebarProvider>
  );
}