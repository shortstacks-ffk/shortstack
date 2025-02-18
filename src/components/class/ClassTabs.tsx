// 'use client';

// import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/tabs';
// import { StudentList } from '@/src/components/students/StudentList';
// import { useState } from 'react';
// import { StudentForm } from '@/src/components/students/StudentForm';

// interface ClassTabsProps {
//   classData: any; // Add proper typing
// }

// export default function ClassTabs({ classData }: ClassTabsProps) {
//   const [showAddStudent, setShowAddStudent] = useState(false);

//   return (
//     <Tabs defaultValue="students" className="w-full">
//       <TabsList>
//         <TabsTrigger value="students">Students</TabsTrigger>
//         <TabsTrigger value="lessonPlans">Lesson Plans</TabsTrigger>
//         <TabsTrigger value="gradebook">Gradebook</TabsTrigger>
//       </TabsList>

//       <TabsContent value="students">
//         <div className="space-y-4">
//           <div className="flex justify-end">
//             <button
//               onClick={() => setShowAddStudent(true)}
//               className="bg-primary text-white px-4 py-2 rounded"
//             >
//               Add Student
//             </button>
//           </div>
//           <StudentList 
//             students={classData.students}
//             classId={classData.code}
//             maxStudents={classData.numberOfStudents}
//           />
//           {showAddStudent && (
//             <StudentForm
//               classId={classData.code}
//               onClose={() => setShowAddStudent(false)}
//               maxStudents={classData.numberOfStudents}
//               currentStudentCount={classData.students.length}
//             />
//           )}
//         </div>
//       </TabsContent>

//       <TabsContent value="lessonPlans">
//         <div>Lesson Plans Content (Coming Soon)</div>
//       </TabsContent>

//       <TabsContent value="gradebook">
//         <div>Gradebook Content (Coming Soon)</div>
//       </TabsContent>
//     </Tabs>
//   );
// }

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { StudentList } from '../students/StudentList';

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
        <div className="flex items-center justify-center h-32 bg-muted/50 rounded-md">
          Lesson Plans feature coming soon
        </div>
      </TabsContent>

      <TabsContent value="gradebook">
        <div className="flex items-center justify-center h-32 bg-muted/50 rounded-md">
          Gradebook feature coming soon
        </div>
      </TabsContent>
    </Tabs>
  );
}