"use client";

// Custom Components
import { ClassCard } from "@/src/components/class/ClassCard";
import { PerformanceChart } from "@/src/components/dashboard/performance-chart";
import { useSession } from "next-auth/react";
import { formatClassSchedule } from "@/src/lib/date-utils";
import AddAnything from "@/src/components/AddAnything";
import AddClass from "@/src/components/class/AddClass";

interface ClassSession {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // Format: HH:MM (24hr)
  endTime: string; // Format: HH:MM (24hr)
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
  }>;
}

// declare module "next-auth" {
//   interface User {
//     id: string;
//     firstName?: string;
//     lastName?: string;
//     role: "TEACHER" | "STUDENT" | "SUPER";
//   }
// }

const DashboardClient = ({ classes }: DashboardClientProps) => {
  const { data: session } = useSession({
    required: true,
  });

  // Get the number of students for each class
  const classesWithCounts = classes.map((cls) => ({
    ...cls,
    numberOfStudents: cls.students?.length || 0,
  }));

  // Limit the displayed classes to 3 maximum
  const displayedClasses = classesWithCounts.slice(0, 3);

  return (
    <div className="w-full">
      <div className="w-full">
        <section className="mb-6 md:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 p-4 sm:p-6 bg-gray-50">
            {displayedClasses.map((cls) => (
              <ClassCard
                key={cls.id}
                id={cls.id}
                emoji={cls.emoji}
                name={cls.name}
                code={cls.code}
                color={cls.color || "primary"}
                grade={cls.grade}
                numberOfStudents={
                  (cls as any)._count?.enrollments || cls.numberOfStudents || 0
                }
                schedule={formatClassSchedule(cls.classSessions)}
                overview={cls.overview}
              />
            ))}
            {displayedClasses.length < 3 && (
              <AddAnything
                title="Create a Class"
                FormComponent={AddClass}
                onItemAdded={(newClass) => {
                  if (newClass) {
                    window.location.reload();
                  }
                }}
              />
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 px-1">
            Performance Overview
          </h2>
          <div className="w-full">
            <div className="rounded-xl p-2 sm:p-3 md:p-5 bg-card border shadow-sm">
              <PerformanceChart />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardClient;
