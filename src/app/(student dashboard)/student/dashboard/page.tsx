'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
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
    </div>
  );
}