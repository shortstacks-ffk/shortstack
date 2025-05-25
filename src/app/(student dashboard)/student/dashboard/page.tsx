'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/src/hooks/use-toast';
import StudentDashboardClient from './StudentDashboardClient';
import { getStudentClasses } from '@/src/app/actions/studentActions';

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
  color?: string;
  grade?: string;
  classSessions?: ClassSession[];
  schedule?: string;
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
  progress?: any;
  teacher?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
}

// Define days of week array for formatting
const DaysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  // Format class sessions into readable schedule strings
  const formatClassSchedule = (sessions?: ClassSession[]) => {
    if (!sessions || sessions.length === 0) return null;
    
    return sessions.map(session => {
      const day = DaysOfWeek[session.dayOfWeek];
      return `${day} ${session.startTime}-${session.endTime}`;
    }).join(', ');
  };

  useEffect(() => {
    // Fetch student info and enrolled classes
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        console.log("Fetching student data with session:", session?.user?.id);
        
        // First fetch profile data
        let profileResponse;
        try {
          profileResponse = await fetch('/api/student/profile', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          
          if (!profileResponse.ok) {
            console.error(`Profile API error: ${profileResponse.status} ${profileResponse.statusText}`);
            if (profileResponse.status === 401) {
              router.push('/student');
              return;
            }
          } else {
            const profileData = await profileResponse.json();
            setStudent(profileData.student);
          }
        } catch (profileError) {
          console.error("Error fetching profile:", profileError);
          // Continue even if profile fetch fails
        }
        
        // Now fetch classes
        try {
          console.log("Fetching classes...");
          const classesResult = await getStudentClasses();
          
          if (!classesResult.success) {
            console.error("Failed to load classes:", classesResult.error);
            toast({
              title: "Classes not loaded",
              description: classesResult.error || "Couldn't load your classes",
              variant: "destructive",
            });
            return;
          }
          
          if (!classesResult.data || classesResult.data.length === 0) {
            console.log("No classes found for student");
            setClasses([]);
            return;
          }
          
          // Transform the class data to include formatted schedules
          const processedClasses = classesResult.data.map((cls: any) => ({
            ...cls,
            schedule: formatClassSchedule(cls.classSessions),
          }));
          
          setClasses(processedClasses);
        } catch (classesError) {
          console.error("Error fetching classes:", classesError);
          toast({
            title: "Error",
            description: "Failed to load your classes",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
        toast({
          title: "Error",
          description: "Failed to load your dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated" && session?.user) {
      fetchStudentData();
    } else if (status === "unauthenticated") {
      router.push('/student');
    }
  }, [router, toast, status, session]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <StudentDashboardClient student={student} classes={classes} />;
}