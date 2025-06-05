import { getClasses } from "@/src/app/actions/classActions";
import { ClassCard } from "@/src/components/class/ClassCard";
import { formatClassSchedule } from "@/src/lib/date-utils";
import AddClass from "@/src/components/class/AddClass";
import AddAnything from "@/src/components/AddAnything";
import { Suspense } from "react";

export const dynamic = 'force-dynamic';

// Main page component
export default function ClassesPage() {
  return (
    <div className="w-full h-full bg-gray-50">
      <Suspense fallback={
        <div className="flex justify-center items-center h-full bg-gray-50">
          <div className="w-20 h-20 border-4 border-green-100 border-t-green-500 rounded-full animate-spin"></div>
        </div>
      }>
        <ClassesContent />
      </Suspense>
    </div>
  );
}

// Classes content component to handle data fetching
async function ClassesContent() {
  const response = await getClasses();

  if (!response.success || !response.data) {
    return <div className="text-center py-8 bg-gray-50 h-full">Failed to load classes</div>;
  }

  // Reverse the array so newest items are at the end
  const sortedClasses = [...response.data].reverse();

  return (
    <div className="min-h-full bg-gray-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-8 sm:p-4 bg-gray-50">
        {sortedClasses.map((cls) => (
            <ClassCard
              id={cls.id}
              emoji={cls.emoji}
              name={cls.name}
              code={cls.code}
              color={cls.color || "primary"}
              grade={cls.grade}
              numberOfStudents={cls._count?.enrollments || 0}
              schedule={formatClassSchedule(cls.classSessions)}
              overview={cls.overview}
            />
        ))}
        

            <AddAnything 
              title="Create a Class" 
              FormComponent={AddClass}
            />
      </div>
    </div>
  );
}

