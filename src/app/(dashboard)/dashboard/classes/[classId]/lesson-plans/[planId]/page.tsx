// app/dashboard/classes/[classId]/[planId]/page.tsx
import LessonPlanDetailPage from './LessonPlanDetailPage';

interface PageProps {
  params: { classId: string; planId: string };
}

export default async function Page({ params }: PageProps) {
  // Here, params is the route's [classId] and [planId]
  const { classId, planId } = await params;

  // Render the client component, passing in classId & planId as props
  return (
    <LessonPlanDetailPage classId={classId} planId={planId} />
  );
}
