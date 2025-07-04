// app/dashboard/classes/[classId]/[planId]/page.tsx
import { Suspense } from 'react';
import ClassLessonPlanDetailPage from './ClassLessonPlanDetailPage';
import { db } from '@/src/lib/db';

// Make sure to define the correct type for params
interface PageProps {
  params: Promise<{
    classId: string;
    planId: string;
  }>;
}

export default async function Page({ params }: PageProps) {

    const { classId, planId } = await params;
  // Get the actual database class ID from the class code parameter
  let realClassId = classId;
  let realPlanId = planId;

  // Check if the classId looks like a code (typically has letters and numbers)
  // Class codes are usually like "G7C42L" while database IDs are UUIDs or numeric
  if (/[A-Za-z]/.test(realClassId)) {
    try {
      // Fetch the real class ID from the database using the code
      const classData = await db.class.findUnique({
        where: { code: realClassId },
        select: { id: true }
      });
      
      if (classData) {
        realClassId = classData.id;
        console.log(`Converted class code ${realClassId} to class ID ${realClassId}`);
      }
    } catch (error) {
      console.error('Error fetching class ID:', error);
    }
  }

  return (
    <ClassLessonPlanDetailPage classId={realClassId} planId={realPlanId} />
  );
}