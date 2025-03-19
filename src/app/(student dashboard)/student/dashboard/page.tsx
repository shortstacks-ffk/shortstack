// import React from 'react';

// export default function StudentDashboard() {
//   return (
//     <main className="container mx-auto p-4 ">
//       <h1 className="text-xl font-bold mb-4 md:text-3xl">
//         Welcome to your Student Dashboard!
//       </h1>
//       <p>
//         You are now logged in. Here you can view your enrolled classes and other related details.
//       </p>
//       {/* Add additional dashboard content here */}
//     </main>
//   );
// }

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
import { StudentJoinClassDialog } from '@/src/components/students/StudentJoinClassDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';

interface Class {
  id: string;
  name: string;
  code: string;
  emoji: string;
}

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [student, setStudent] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Fetch student info and enrolled classes
    const fetchStudentData = async () => {
      try {
        const res = await fetch('/api/student/profile');
        if (!res.ok) {
          // Handle unauthorized or other errors
          router.push('/student');
          return;
        }

        const data = await res.json();
        setStudent(data.student);
        setClasses(data.classes || []);
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/student/auth', {
        method: 'DELETE',
      });
      router.push('/student');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, {student?.firstName} {student?.lastName}!
          </h1>
          <p className="text-gray-600">{student?.schoolEmail}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Classes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.length > 0 ? (
            classes.map((cls) => (
              <Card key={cls.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{cls.emoji}</span>
                    <span>{cls.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">Class Code: {cls.code}</p>
                  <Button 
                    className="mt-4 w-full"
                    onClick={() => router.push(`/student/dashboard/classes/${cls.code}`)}
                  >
                    Go to Class
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8 bg-muted/30 rounded-lg">
              <p className="text-gray-500 mb-4">You haven't joined any classes yet.</p>
              <StudentJoinClassDialog />
            </div>
          )}
        </div>
        
        {classes.length > 0 && (
          <div className="mt-6">
            <StudentJoinClassDialog />
          </div>
        )}
      </div>
    </div>
  );
}