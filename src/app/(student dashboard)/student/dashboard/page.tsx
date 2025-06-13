'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/src/hooks/use-toast';
import StudentDashboardClient from './StudentDashboardClient';
import { getStudentClasses } from '@/src/app/actions/studentActions';
import { getStudentOverallProgress } from "@/src/app/actions/gradebookActions";

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

const DaysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const formatClassSchedule = (sessions?: ClassSession[]) => {
    if (!sessions || sessions.length === 0) return null;
    
    return sessions.map(session => {
      const day = DaysOfWeek[session.dayOfWeek];
      return `${day} ${session.startTime}-${session.endTime}`;
    }).join(', ');
  };

  useEffect(() => {
    const fetchStudentData = async () => {
      console.log("Starting to fetch student data...");
      try {
        setLoading(true);
        
        if (!session?.user) {
          console.log("No session user found");
          return;
        }

        console.log("Session user:", session.user);

        // Create student data from session with safe access
        const baseStudentData: Student = {
          id: session.user.id,
          firstName: session.user.firstName || 'Student',
          lastName: session.user.lastName || 'User',
          schoolEmail: session.user.email || '',
          profileImage: (session.user as any)?.image || null,
          progress: null
        };
        
        console.log("Base student data:", baseStudentData);
        setStudent(baseStudentData);
        
        // Try to enhance with profile data
        try {
          console.log("Fetching enhanced profile data...");
          const profileResponse = await fetch('/api/student/profile', {
            credentials: 'include',
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log("Profile data received:", profileData);
            if (profileData) {
              const enhancedStudentData = {
                ...baseStudentData,
                ...profileData,
                progress: null
              };
              console.log("Enhanced student data:", enhancedStudentData);
              setStudent(enhancedStudentData);
            }
          } else {
            console.error("Profile fetch failed:", await profileResponse.text());
          }
        } catch (profileError) {
          console.error("Profile fetch error:", profileError);
          // Continue with base data if profile fetch fails
        }

        // Fetch progress data
        try {
          console.log("Fetching progress data...");
          const progressResult = await getStudentOverallProgress();
          
          if (progressResult.success && progressResult.data?.progress) {
            const progress = progressResult.data.progress;
            console.log("Progress data:", progress);
            
            setStudent(prev => {
              if (!prev) return null;
              return { ...prev, progress };
            });
          } else {
            console.log("Progress fetch failed:", progressResult.error);
          }
        } catch (progressError) {
          console.error("Progress fetch error:", progressError);
        }
        
        // Fetch classes
        try {
          console.log("Fetching classes...");
          const classesResult = await getStudentClasses();
          if (classesResult.success && classesResult.data) {
            const processedClasses = classesResult.data.map((cls: any) => ({
              ...cls,
              schedule: formatClassSchedule(cls.classSessions),
            }));
            console.log("Classes data:", processedClasses);
            setClasses(processedClasses);
          } else {
            console.log("Classes fetch failed:", classesResult.error);
            setClasses([]);
          }
        } catch (classesError) {
          console.error("Classes fetch error:", classesError);
          setClasses([]);
        }

      } catch (error) {
        console.error("Error in fetchStudentData:", error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        console.log("Setting loading to false");
        setLoading(false);
      }
    };

    if (status === "loading") {
      console.log("Session still loading...");
      return;
    }

    if (status === "unauthenticated") {
      console.log("User not authenticated, redirecting...");
      router.push('/student');
      return;
    }

    if (session?.user?.role !== "STUDENT") {
      console.log("User is not a student, redirecting...");
      router.push('/student');
      return;
    }

    fetchStudentData();
  }, [router, toast, status, session]);

  // Show loading state
  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Show the dashboard
  console.log("Rendering StudentDashboardClient with:", { student, classes });
  return <StudentDashboardClient student={student} classes={classes} />;
}