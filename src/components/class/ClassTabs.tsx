"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import LessonPlansList  from '@/src/components/lessonPlans/LessonPlansList';
import ClassOverview from '@/src/components/class/ClassOverview';
import { useSearchParams } from 'next/navigation';
import Gradebook from "../gradebook/Gradebook";

interface ClassTabsProps {
  classData: {
    id: string;
    name: string;
    code: string;
    students: any[];
    overview?: string | null;
  };
}

export default function ClassTabs({ classData }: ClassTabsProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  
  return (
    <Tabs defaultValue={initialTab} className="w-full space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="lessonPlans">Lesson Plans</TabsTrigger>
        <TabsTrigger value="gradebook">Gradebook</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <ClassOverview
          classData={{
            ...classData,
            overview: classData.overview ?? undefined,
          }}
        />
      </TabsContent>

      <TabsContent value="lessonPlans">
        <LessonPlansList classCode={classData.code} cName={classData.name} />
      </TabsContent>

      <TabsContent value="gradebook">
        <Gradebook classCode={classData.code} />
      </TabsContent>
    </Tabs>
  );
}
