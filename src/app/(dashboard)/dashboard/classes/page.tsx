import { getClasses } from "@/src/app/actions/classActions";
import { getRandomColorClass } from "@/src/lib/colorUtils";
import DashboardAddClassCard from "@/src/components/dashboard-add-class-card";
import { ClassCard } from "@/src/components/ClassCard";

export default async function ClassesPage() {
  const response = await getClasses();

  if (!response.success || !response.data) {
    return <div>Failed to load classes</div>;
  }

  // Assign each class a unique color based on its id.
  const classesWithColors = response.data.map((cls) => ({
    ...cls,
    colorClass: getRandomColorClass(cls.id)
  }));

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">My Classes</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {classesWithColors.map((cls) => (
          <ClassCard  key={cls.id} {...cls} />
        ))}
        <DashboardAddClassCard  />
      </div>
    </main>
  );
}