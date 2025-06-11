import { Suspense } from "react";
import {
  getGenericLessonPlans,
  getLessonPlans,
} from "@/src/app/actions/lessonPlansActions";
import LessonPlansContent from "./LessonPlansContent";
import { getAuthSession } from "@/src/lib/auth";

// Server component wrapper to fetch data
async function LessonPlansContentWrapper() {
  const session = await getAuthSession();
  
  if (!session?.user?.id) {
    return <div className="text-center py-8 bg-gray-50 h-full">Please sign in to view lesson plans</div>;
  }

  const isSuperUser = session?.user?.role === "SUPER";
  
  // Fetch both user plans and generic plans on the server
  const [userPlansResponse, genericPlansResponse] = await Promise.all([
    !isSuperUser ? getLessonPlans() : Promise.resolve({ success: true, data: [] }),
    getGenericLessonPlans("all")
  ]);

  if (!userPlansResponse.success && !genericPlansResponse.success) {
    return <div className="text-center py-8 bg-gray-50 h-full">Failed to load lesson plans</div>;
  }

  return (
    <LessonPlansContent
      initialUserPlans={userPlansResponse.data || []}
      initialGenericPlans={genericPlansResponse.data || []}
      isSuperUser={isSuperUser}
    />
  );
}

export default function LessonPlansPageServer() {
  return (
    <div className="w-full h-full bg-gray-50">
      <Suspense fallback={
        <div className="flex justify-center items-center h-full bg-gray-50">
          <div className="w-20 h-20 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
        </div>
      }>
        <LessonPlansContentWrapper />
      </Suspense>
    </div>
  );
}