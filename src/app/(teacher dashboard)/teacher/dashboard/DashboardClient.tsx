"use client"

// Custom Components
import { ClassCard } from "@/src/components/class/ClassCard";
import DashboardAddClassCard from "@/src/components/class/dashboard-add-class-card";
import { PerformanceChart } from "@/src/components/dashboard/performance-chart";
import DashboardRightSidebar from "@/src/components/dashboard/DashboardRightSidebar";
import { useSession } from "next-auth/react";

interface ClassSession {
  id: string;
  dayOfWeek: number;  // 0 = Sunday, 1 = Monday, etc.
  startTime: string;  // Format: HH:MM (24hr)
  endTime: string;    // Format: HH:MM (24hr)
}

interface DashboardClientProps {
  classes: Array<{
    id: string;
    name: string;
    code: string;
    emoji: string;
    color?: string;
    grade?: string;
    overview?: string;
    classSessions?: ClassSession[];
    students?: { id: string }[];
  }>
}

declare module "next-auth" {
  interface User {
    id: string;
    firstName?: string;
    lastName?: string;
    role: "TEACHER" | "STUDENT" | "SUPER";
  }
}

const DaysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DashboardClient = ({ classes }: DashboardClientProps) => {
  const { data: session } = useSession({
    required: true,
  });
  
  // Get the number of students for each class
  const classesWithCounts = classes.map(cls => ({
    ...cls,
    numberOfStudents: cls.students?.length || 0
  }));

  // Limit the displayed classes to 3 maximum
  const displayedClasses = classesWithCounts.slice(0, 3);

  // Format class sessions into a readable schedule string
  const formatClassSchedule = (sessions?: ClassSession[]) => {
    if (!sessions || sessions.length === 0) return null;
    
    return sessions.map(session => {
      const day = DaysOfWeek[session.dayOfWeek];
      return `${day} ${session.startTime}-${session.endTime}`;
    }).join(', ');
  };

  return (
    <div className="flex h-full relative">
      <main className="flex-1 flex flex-col items-center p-4 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto">
          <section className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedClasses.map((cls) => (
                <ClassCard
                  key={cls.id}
                  id={cls.id}
                  emoji={cls.emoji}
                  name={cls.name}
                  code={cls.code}
                  color={cls.color || "primary"}
                  grade={cls.grade}
                  numberOfStudents={cls.numberOfStudents}
                  schedule={formatClassSchedule(cls.classSessions)}
                  overview={cls.overview}
                />
              ))}
              {displayedClasses.length < 3 && <DashboardAddClassCard />}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Performance Overview</h2>
            <div className="w-full">
              <div className="rounded-xl p-5 bg-card border shadow-sm">
                <PerformanceChart 
                  recentClasses={classesWithCounts.slice(0, Math.min(3, classesWithCounts.length))}
                />
              </div>
            </div>
          </section>
        </div>
      </main>
      
      {/* Right Sidebar - always rendered but toggled with CSS */}
      {/* <DashboardRightSidebar /> */}
    </div>
  )
}

export default DashboardClient