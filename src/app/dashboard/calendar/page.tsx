"use client";
import { SidebarLeft } from "@/components/sidebar-left";
import { Card } from "@/components/ui/card"
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar"


import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// This is sample data.S
const data = {
  user: {
    name: "Bob Teacher",
    email: "bobteacher@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  calendars: [
    {
      name: "My Calendars",
      items: ["Personal", "Work", "Family"],
    },
  ],
};

export default function Page() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
          <Card className="p-6 shadow-lg">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
               className="w-[800px] h-[600px] rounded-md"
            />
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
