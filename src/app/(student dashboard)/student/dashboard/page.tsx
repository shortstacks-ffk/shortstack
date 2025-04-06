'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react'; // Ensure signOut is imported directly
import { useToast } from '@/src/hooks/use-toast'; // Use your toast hook
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/src/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/src/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/components/ui/avatar';
import { SessionDebugger } from '@/src/components/debug/SessionDebug';

interface Class {
  id: string;
  name: string;
  code: string;
  emoji: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  schoolEmail: string;
  profileImage?: string | null;
  progress?: any;
}

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  
  console.log("Session status:", status);
  console.log("Session data:", session);
  const { toast } = useToast(); // Add toast

  useEffect(() => {
    // Fetch student info and enrolled classes
    const fetchStudentData = async () => {
      try {
        const res = await fetch('/api/student/profile', {
          credentials: 'include', // Ensure cookies are sent
        });
        
        if (!res.ok) {
          // Handle unauthorized or other errors
          if (res.status === 401) {
            router.push('/student');
            return;
          }
          throw new Error("Failed to fetch student data");
        }

        const data = await res.json();
        setStudent(data.student);
        setClasses(data.classes || []);
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

    fetchStudentData();
  }, [router, toast]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/student' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!student) return 'ST';
    return `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, {student?.firstName} {student?.lastName}!
          </h1>
          <p className="text-gray-600">{student?.schoolEmail}</p>
        </div>
        
        {/* User Avatar and Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10 border-2 border-gray-200">
                <AvatarImage 
                  src={student?.profileImage || ''} 
                  alt={`${student?.firstName} ${student?.lastName}`} 
                />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{student?.firstName} {student?.lastName}</p>
                <p className="text-xs text-gray-500">{student?.schoolEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/student/dashboard/account">
                <User className="mr-2 h-4 w-4" />
                <span>My Account</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/student/dashboard/account/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Quick Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>My Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${student?.progress?.overallProgress || 0}%` }}
                ></div>
              </div>
              <span className="ml-2 text-sm">{student?.progress?.overallProgress || 0}%</span>
            </div>
          </CardContent>
        </Card>

        {/* My Classes Card */}
        <Card>
          <CardHeader>
            <CardTitle>My Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{classes.length}</p>
            <p className="text-gray-500 text-sm">Enrolled Classes</p>
          </CardContent>
        </Card>

        {/* Upcoming Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{student?.progress?.completedAssignments || 0}/{student?.progress?.totalAssignments || 0}</p>
            <p className="text-gray-500 text-sm">Completed Assignments</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Session Debugger (only shows in development) */}
      <SessionDebugger />
    </div>
  );
}