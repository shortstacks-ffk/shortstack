// app/dashboard/classes/[classId]/[planId]/page.tsx
import ClassLessonPlanDetailPage from './ClassLessonPlanDetailPage';

interface PageProps {
  params: Promise<{ classId: string; planId: string }>;
}

export default async function Page({ params }: PageProps) {
  // Await the params before destructuring
  const { classId, planId } = await params;

  // Render the client component, passing in classId & planId as props
  return (
    <ClassLessonPlanDetailPage classId={classId} planId={planId} />
  );
}