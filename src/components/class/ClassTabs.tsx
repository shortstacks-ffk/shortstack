'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { StudentList } from '../students/StudentList';
// import { LessonPlans} from '@/src/components/class/LessonPlans';
import LessonPlansList  from '@/src/components/lesson_plans/LessonPlansList';

interface ClassTabsProps {
  classData: {
    id: string;
    name: string;
    code: string;
    numberOfStudents: number;
    students: any[];
  };
}

export default function ClassTabs({ classData }: ClassTabsProps) {
  return (
    // <div> Class code: {classData.code} </div>
    <Tabs defaultValue="students" className="w-full space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="students">Students</TabsTrigger>
        <TabsTrigger value="lessonPlans">Lesson Plans</TabsTrigger>
        <TabsTrigger value="gradebook">Gradebook</TabsTrigger>
      </TabsList>

      <TabsContent value="students" className="space-y-4">
        <StudentList
          classCode={classData.code}
          maxStudents={classData.numberOfStudents}
        />
      </TabsContent>

      <TabsContent value="lessonPlans">
        <LessonPlansList classCode={classData.code} cName={classData.name} />
      </TabsContent>

      <TabsContent value="gradebook">
        <div className="flex items-center justify-center h-32 bg-muted/50 rounded-md">
          Gradebook feature coming soon
        </div>
      </TabsContent>
    </Tabs>
  );
}