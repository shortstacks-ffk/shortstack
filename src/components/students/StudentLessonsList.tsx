'use client';

import { Card, CardContent } from '@/src/components/ui/card';
import Link from 'next/link';
import { Book } from 'lucide-react';
import { formatDate } from '@/src/lib/utils';

interface StudentLessonsListProps {
  classCode: string;
  classId: string;
  lessonPlans: any[];
}

export default function StudentLessonsList({ classCode, classId, lessonPlans }: StudentLessonsListProps) {
  if (!lessonPlans || lessonPlans.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/20 rounded-md">
        <p className="text-muted-foreground">No lessons available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {lessonPlans.map((lesson) => (
          <Link 
            href={`/student/dashboard/classes/${classCode}/lessons/${lesson.id}`}
            key={lesson.id}
          >
            <Card className="bg-blue-50 w-[250px] h-[250px] rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative">
              <CardContent className="flex flex-col justify-center items-center h-full">
                <h3 className="text-lg font-bold text-black line-clamp-2 mb-2 mt-6">{lesson.name}</h3>
                
                 <span className="text-sm font-medium truncate">
                  {lesson.createdAt ? formatDate(new Date(lesson.createdAt)) : 'No date'}
                </span>
              </CardContent>
              
              <CardContent className="flex flex-col justify-center items-center h-full pt-10">
                <h3 className="text-xl font-bold text-center">{lesson.name}</h3>
                
                
                {/* <div className="mt-auto w-full flex justify-between items-center text-xs text-muted-foreground pt-4">

                <div className="mt-auto w-full flex justify-between items-center text-xs text-muted-foreground pt-4">

                  <span>{lesson.assignments?.length || 0} assignments</span>
                  <span>{lesson.files?.length || 0} materials</span>
                </div> */}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}