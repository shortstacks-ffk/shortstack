'use client';

import { Card, CardContent } from '@/src/components/ui/card';

interface StudentClassOverviewProps {
  classData: {
    id: string;
    name: string;
    code: string;
    emoji: string;
    overview?: string;
    teacher?: {
      profileImage?: string;
      firstName?: string;
      lastName?: string;
    };
  };
}

export default function StudentClassOverview({ classData }: StudentClassOverviewProps) {
  return (
    <div className="space-y-4">
    <h2 className="text-xl font-semibold flex items-center"> Description </h2>
    <hr className="w-1/2 border-t-2 border-orange-500" />
    <div className="max-w-2xl w-full pb-6">
      {classData.overview ? (
        <div 
        dangerouslySetInnerHTML={{ __html: classData.overview }} 
        />
      ) : (
        <div className="text-center text-muted-foreground py-8">
        No class overview available yet.
        </div>
      )}
    

      
      
    </div>
    {classData.teacher?.profileImage && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">{classData.teacher?.firstName || "Unknown"} {classData.teacher?.lastName || ""}</h3>
          <div className="flex items-center">
        <img 
          src={classData.teacher.profileImage} 
          alt="Teacher profile" 
          className="h-20 w-20 rounded-full object-cover border-2 border-orange-500"
        />
        <span className="ml-3 text-sm text-muted-foreground">Class Instructor</span>
          </div>
        </div>
      )}
    </div>
  );
}