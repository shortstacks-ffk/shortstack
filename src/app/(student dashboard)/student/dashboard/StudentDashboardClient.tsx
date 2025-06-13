"use client";

import { Card, CardContent } from "@/src/components/ui/card";
import { StudentClassCard } from "@/src/components/class/StudentClassCard";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { SessionDebugger } from "@/src/components/debug/SessionDebug";
import { formatCurrency } from "@/src/lib/utils";

// Define the color options for class cards
const CLASS_COLORS = [
  "primary",
  "secondary",
  "success",
  "warning",
  "destructive",
  "default",
];

interface ClassSession {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Class {
  id: string;
  name: string;
  code: string;
  emoji: string;
  grade?: string;
  color?: string;
  schedule?: string;
  classSessions?: ClassSession[];
  _count?: {
    enrollments: number;
  };
}

const DaysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Helper function to format class schedules
const formatClassSchedule = (sessions?: ClassSession[]) => {
  if (!sessions || sessions.length === 0) return null;

  return sessions
    .map((session) => {
      const day = DaysOfWeek[session.dayOfWeek];
      return `${day} ${session.startTime}-${session.endTime}`;
    })
    .join(", ");
};

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  schoolEmail: string;
  profileImage?: string | null;
  progress?: {
    completedAssignments: number;
    totalAssignments: number;
    points: number;
    balance: number;
    streak: number;
  } | null;
  teacher?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
}

interface StudentDashboardClientProps {
  student: Student | null;
  classes: Class[];
}

export default function StudentDashboardClient({
  student,
  classes,
}: StudentDashboardClientProps) {
  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!student) return "ST";
    return `${student.firstName?.charAt(0) || ""}${student.lastName?.charAt(0) || ""}`;
  };

  // Process classes to ensure they have colors and counts
  const classesWithColors = classes.map((classItem, index) => {
    // Generate schedule if not already provided
    const schedule =
      classItem.schedule || formatClassSchedule(classItem.classSessions);

    if (!classItem.color) {
      // Use the class item's index to pick a color, or cycle through colors if more classes than colors
      const colorIndex = index % CLASS_COLORS.length;
      return {
        ...classItem,
        color: CLASS_COLORS[colorIndex],
        schedule,
        _count: classItem._count || { enrollments: 0 },
      };
    }
    return {
      ...classItem,
      schedule,
      _count: classItem._count || { enrollments: 0 },
    };
  });

  return (
    <div className="w-full">
      
      {/* Classes Section */}
      <section className="w-full mb-8">
        <h2 className="text-xl md:text-2xl font-semibold mb-6 text-gray-800">
          My Classes
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {classesWithColors.length > 0 ? (
            classesWithColors
              .slice(0, 3)
              .map((classItem) => (
                <StudentClassCard
                  key={classItem.id}
                  id={classItem.id}
                  emoji={classItem.emoji}
                  name={classItem.name}
                  code={classItem.code}
                  color={classItem.color}
                  grade={classItem.grade}
                  schedule={classItem.schedule}
                  numberOfStudents={classItem._count?.enrollments}
                />
              ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">
                  You don't have any classes yet.
                </p>
                <Link href="/student/dashboard/classes">
                  <Button variant="default" className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Join a Class
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {classesWithColors.length > 0 && classesWithColors.length > 3 && (
            <Card className="bg-muted/40 border border-dashed border-muted-foreground/20">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                <p className="text-muted-foreground mb-2">
                  {classesWithColors.length - 3} more classes
                </p>
                <Link href="/student/dashboard/classes">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Progress Cards */}
      <section className="w-full">
        <h2 className="text-xl md:text-2xl font-semibold mb-6 text-gray-800">
          My Progress
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Completed Assignments Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 border-0 rounded-xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-300/10 to-indigo-400/10 rounded-full translate-y-6 -translate-x-6"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg mb-4 shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2">
                {student?.progress?.completedAssignments || 0}/
                {student?.progress?.totalAssignments || 0}
              </p>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Completed Assignments
              </p>
            </div>
          </div>

          {/* Average Grade Card (formerly Total Points) */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-100 border-0 rounded-xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-emerald-300/10 to-teal-400/10 rounded-full translate-y-6 -translate-x-6"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg mb-4 shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>

              <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent mb-2">
                {student?.progress?.points || 0}%
              </p>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Average Grade
              </p>
            </div>
          </div>

          {/* Bank Balance Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100 border-0 rounded-xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-amber-300/10 to-orange-400/10 rounded-full translate-y-6 -translate-x-6"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg mb-4 shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>

              <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-700 bg-clip-text text-transparent mb-2">
                {formatCurrency(student?.progress?.balance || 0)}
              </p>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Bank Balance
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
