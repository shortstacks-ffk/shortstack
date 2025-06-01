"use client"

// Custom Components
import { ClassCard } from "@/src/components/class/ClassCard";
import DashboardAddClassCard from "@/src/components/class/dashboard-add-class-card";
import { PerformanceChart } from "@/src/components/dashboard/performance-chart";
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

// Add the formatClassSchedule function for consistent display
const DaysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatClassSchedule(sessions?: any[]) {
  if (!sessions || sessions.length === 0) return null;
  
  return sessions.map(session => {
    const day = DaysOfWeek[session.dayOfWeek];
    return `${day} ${session.startTime}-${session.endTime}`;
  }).join(', ');
}

  return (
    <div className="w-full">
      <div className="w-full">
        <section className="mb-6 md:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {displayedClasses.map((cls) => (
              <ClassCard
                key={cls.id}
                id={cls.id}
                emoji={cls.emoji}
                name={cls.name}
                code={cls.code}
                color={cls.color || "primary"}
                grade={cls.grade}
                numberOfStudents={(cls as any)._count?.enrollments || cls.numberOfStudents || 0}
                schedule={formatClassSchedule(cls.classSessions)}
                overview={cls.overview}
              />
            ))}
            {displayedClasses.length < 3 && <DashboardAddClassCard />}
          </div>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 px-1">Performance Overview</h2>
          <div className="w-full">
            <div className="rounded-xl p-2 sm:p-3 md:p-5 bg-card border shadow-sm">
              <PerformanceChart 
                recentClasses={classesWithCounts.slice(0, Math.min(3, classesWithCounts.length))}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default DashboardClient