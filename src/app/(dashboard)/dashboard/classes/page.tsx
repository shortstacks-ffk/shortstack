import { getClasses } from "@/src/app/actions/classActions";
import DashboardAddClassCard from "@/src/components/class/dashboard-add-class-card";
import { ClassCard } from "@/src/components/class/ClassCard";

export default async function ClassesPage() {
  const getColumnIndex = (index: number) => {
    const row = Math.floor(index / 3);
    return index - (row * 3);
  };

  const response = await getClasses();

  if (!response.success || !response.data) {
    return <div>Failed to load classes</div>;
  }

    // Reverse the array so newest items are at the end
    const sortedClasses = [...response.data].reverse();

  const classesWithColumns = sortedClasses.map((cls, index) => ({
    ...cls,
    columnIndex: getColumnIndex(index)
  }));

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">My Classes</h1>
      <div className="max-w-4xl ml-0 mr-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classesWithColumns.map((cls) => (
            <ClassCard
              key={cls.id}
              {...cls}
              className={`grid-column w-[250px] h-[250px] rounded-xl flex flex-col ${
                cls.columnIndex === 0
                  ? "bg-[#009245]"
                  : cls.columnIndex === 1
                  ? "bg-[#F57600]"
                  : "bg-[#E63A93]"
              }`}
            />
          ))}
          <DashboardAddClassCard />
        </div>
      </div>
    </main>
  );
}