import { getBills } from "@/src/app/actions/billActions";
import DashboardAddBillCard from "@/src/components/bills/dashboardAddBillCard";
import { BillCard } from "@/src/components/bills/BillCard";

export default async function BillsPage() {
  const getColumnIndex = (index: number) => {
    const row = Math.floor(index / 3);
    return index - (row * 3);
  };

  const response = await getBills();

  if (!response.success || !response.data) {
    return <div>Failed to load bills</div>;
  }

  // Reverse the array so newest items are at the end
  const sortedBills = [...response.data].reverse();

  const billsWithColumns = sortedBills.map((bill, index) => ({
    ...bill,
    columnIndex: getColumnIndex(index)
  }));

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Bills</h1>
      <div className="max-w-4xl ml-0 mr-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {billsWithColumns.map((bill) => (
            <BillCard
              key={bill.id}
              {...bill}
              className={`grid-column w-[250px] h-[250px] rounded-xl flex flex-col ${
                bill.columnIndex === 0
                  ? "bg-[#009245]"
                  : bill.columnIndex === 1
                  ? "bg-[#F57600]"
                  : "bg-[#E63A93]"
              }`}
            />
          ))}
          <DashboardAddBillCard />
        </div>
      </div>
    </main>
  );
}