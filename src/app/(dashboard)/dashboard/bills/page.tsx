import { getBills } from "@/src/app/actions/billActions";
import DashboardAddBillCard from "@/src/components/bills/dashboardAddBillCard";
import { BillCard } from "@/src/components/bills/BillCard";

export default async function BillsPage() {
  const getColumnColor = (index: number) => {
    switch (index % 3) {
      case 0:
        return "bg-green-200";
      case 1:
        return "bg-emerald-200";
      case 2:
        return "bg-teal-200";
      default:
        return "bg-blue-200";
    }
  };

  const response = await getBills();

  if (!response.success || !response.data) {
    return <div>Failed to load bills</div>;
  }

  // Reverse the array so newest items are at the end
  const sortedBills = [...response.data].sort((a, b) => {
    //First compare by frequency
    if(a.frequency !== "ONCE" && b.frequency === "ONCE") return -1;
    if(a.frequency === "ONCE" && b.frequency !== "ONCE") return 1;

    //If frequencies are the same, sort by due date
    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();
    return dateA - dateB;
  });
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Bills</h1>
      <div className="max-w-4xl ml-0 mr-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedBills.map((bill, index) => (
            <BillCard
              key={bill.id}
              {...bill}
              backgroundColor={getColumnColor(index)}
            />
          ))}
          <DashboardAddBillCard />
        </div>
      </div>
    </main>
  );
}