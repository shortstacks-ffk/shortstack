import { getClassData } from '@/src/app/actions/classActions';
import StudentClassTabs from '@/src/components/students/StudentClassTabs';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

interface PageParams {
  params: {
    classId: string;
  };
}

export default async function StudentClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  try {

    // Await the params to get the classId
  // This is necessary because params is a Promise in this context
  const { classId } = await params;
  const classData = await getClassData(classId);
    
    if (!classData) {
      notFound();
    }

    return (
      <main className="container mx-auto p-4">
        <Suspense fallback={<div>Loading...</div>}>
          <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">
              {classData.emoji} {classData.name}
            </h1>
            <StudentClassTabs classData={classData} />
          </div>
        </Suspense>
      </main>
    );
  } catch (error) {
    console.error("Error in StudentClassPage:", error);
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-red-500">Failed to load class data. Please try again later.</p>
      </div>
    );
  }
}