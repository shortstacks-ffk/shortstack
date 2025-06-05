import { getClassData } from '@/src/app/actions/classActions';
import ClassTabs from '@/src/components/class/ClassTabs';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function ClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const result = await getClassData(classId);
  
  if (!result?.success || !result.data) {
    notFound();
  }

  // Fix: Make sure classData contains the class code and is properly structured
  const classData = {
    ...result.data,
    code: classId, // Ensure the code is explicitly set
    students: result.data.students || []
  };

  return (
    <main className="container mx-auto p-4">
      <Suspense fallback={<div>Loading...</div>}>
      <div className="mb-4">
        <Link href="/teacher/dashboard/classes" className="flex items-center text-gray-500 hover:text-gray-700">
          <ArrowLeft className="mr-2" />
          <span>Back to Classes</span>
        </Link>
      </div>
        <div className="container mx-auto p-6">
          <h1 className="text-2xl font-bold mb-6">
            {classData.emoji} {classData.name}
          </h1>
          <ClassTabs classData={classData} />
        </div>
      </Suspense>
    </main>
  );
}