import { Suspense } from "react";
import StudentCalendarClient from "./StudentCalendarClient";

export default function StudentCalendarPage() {
  return (
    <div className="h-full w-full overflow-hidden">
      <Suspense fallback={
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin h-6 w-6 border-t-2 border-b-2 border-primary rounded-full"></div>
        </div>
      }>
        <StudentCalendarClient />
      </Suspense>
    </div>
  );
}