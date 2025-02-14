'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/tabs';
import { StudentList } from '@/src/components/students/StudentList';
import { useState } from 'react';
import { StudentForm } from '@/src/components/students/StudentForm';

interface ClassTabsProps {
  classData: any; // Add proper typing
}

export default function ClassTabs({ classData }: ClassTabsProps) {
  const [showAddStudent, setShowAddStudent] = useState(false);

  return (
    <Tabs defaultValue="students" className="w-full">
      <TabsList>
        <TabsTrigger value="students">Students</TabsTrigger>
        <TabsTrigger value="lessonPlans">Lesson Plans</TabsTrigger>
        <TabsTrigger value="gradebook">Gradebook</TabsTrigger>
      </TabsList>

      <TabsContent value="students">
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddStudent(true)}
              className="bg-primary text-white px-4 py-2 rounded"
            >
              Add Student
            </button>
          </div>
          <StudentList 
            students={classData.students}
            classId={classData.code}
            maxStudents={classData.numberOfStudents}
          />
          {showAddStudent && (
            <StudentForm
              classId={classData.code}
              onClose={() => setShowAddStudent(false)}
              maxStudents={classData.numberOfStudents}
              currentStudentCount={classData.students.length}
            />
          )}
        </div>
      </TabsContent>

      <TabsContent value="lessonPlans">
        <div>Lesson Plans Content (Coming Soon)</div>
      </TabsContent>

      <TabsContent value="gradebook">
        <div>Gradebook Content (Coming Soon)</div>
      </TabsContent>
    </Tabs>
  );
}