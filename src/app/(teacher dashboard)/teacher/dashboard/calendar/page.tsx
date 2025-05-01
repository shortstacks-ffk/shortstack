import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/src/components/ui/breadcrumb";
import { Separator } from "@/src/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
} from "@/src/components/ui/sidebar";
import TeacherCalendarClient from "./TeacherCalendarClient";
import { TodoSidebar } from "@/src/components/todo-sidebar";

export default function CalendarPage() {
  return (
    <SidebarProvider>
      <SidebarInset>
        <div className="p-6">
          <TeacherCalendarClient />
        </div>
      </SidebarInset>
      <TodoSidebar />
    </SidebarProvider>
  );
}
