"use client";

import { useEffect, useState, Suspense } from "react";
import { getClasses } from "@/src/app/actions/classActions";
import { ClassCard } from "@/src/components/class/ClassCard";
import { formatClassSchedule } from "@/src/lib/date-utils";
import AddClass from "@/src/components/class/AddClass";
import AddAnything from "@/src/components/AddAnything";

// Define proper TypeScript types
interface ClassData {
  id: string;
  name: string;
  emoji: string;
  code: string;
  color?: string;
  grade: string;
  overview?: string;
  classSessions: any[];
  _count?: {
    enrollments: number;
  };
}

interface ClassResponse {
  success: boolean;
  data?: ClassData[];
  error?: string;
}

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

// Convert ClassesContent to client component for instant updates
function ClassesContent() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Function to fetch classes
  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response: ClassResponse = await getClasses();
      
      if (!response.success || !response.data) {
        setError(response.error || "Failed to load classes");
        return;
      }
      
      // Ensure we have an array to work with
      setClasses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching classes:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle class added event
  const handleClassAdded = (newClass: ClassData | null) => {
    if (newClass && newClass.id) {
      // Immediately add the new class to the UI without refetching
      setClasses(prevClasses => [newClass, ...prevClasses]);
    } else {
      // If we don't have class data, refetch everything
      fetchClasses();
    }
  };
  
  // Add this function to handle class deletion
  const handleClassDeleted = (deletedClassId: string) => {
    // Update the classes state by filtering out the deleted class
    setClasses(prevClasses => prevClasses.filter(cls => cls.id !== deletedClassId));
  };
  
  // Add this function to ClassesContent component:
  const handleClassUpdated = (updatedClass: any) => {
    setClasses(prevClasses => 
      prevClasses.map(cls => 
        cls.id === updatedClass.id 
          ? { 
              ...cls, 
              ...updatedClass,
              // Ensure we preserve the enrollment count and other nested data
              _count: cls._count,
              // Make sure classSessions is properly updated
              classSessions: updatedClass.classSessions || []
            }
          : cls
      )
    );
  };
  
  // Fetch classes on component mount
  useEffect(() => {
    fetchClasses();
  }, []);
  
  if (loading && classes.length === 0) {
    return (
      <div className="flex justify-center items-center h-full bg-gray-50">
        <div className="w-20 h-20 border-4 border-green-100 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (error && classes.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 h-full">
        <p className="text-red-500 mb-2">Failed to load classes</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-full bg-gray-50">
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4 sm:p-6 bg-gray-50">
        {classes.map((cls) => (
          <ClassCard
            key={cls.id}
            id={cls.id}
            emoji={cls.emoji}
            name={cls.name}
            code={cls.code}
            color={cls.color || "primary"}
            grade={cls.grade}
            numberOfStudents={cls._count?.enrollments || 0}
            schedule={formatClassSchedule(cls.classSessions)}
            overview={cls.overview}
            onDelete={handleClassDeleted}
            onUpdate={handleClassUpdated}
          />
        ))}
        
        <AddAnything 
          title="Create a Class" 
          FormComponent={AddClass}
          onItemAdded={handleClassAdded}
        />
      </div>
    </div>
  );
}