import { getBill } from "@/src/app/actions/billActions";
import { Card } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";

export default async function BillDetailPage({
  params,
}: {
  params: { billId: string };
}) {
  const response = await getBill(params.billId);

  if (!response.success || !response.data) {
    return <div>Failed to load bill details</div>;
  }

  const bill = response.data;

  return (
    <main className="container mx-auto p-4">
      <div className="max-w-4xl ml-0 w-full">
        <h1 className="text-3xl font-bold mb-4">{bill.title}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Bill Details</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Amount:</span> {formatCurrency(bill.amount)}</p>
              <p><span className="font-medium">Due Date:</span> {new Date(bill.dueDate).toLocaleDateString()}</p>
              <p><span className="font-medium">Frequency:</span> {bill.frequency}</p>
              <p><span className="font-medium">Status:</span> {bill.status}</p>
              {bill.description && (
                <p><span className="font-medium">Description:</span> {bill.description}</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Assigned Classes</h2>
            {bill.class && bill.class.length > 0 ? (
              <div className="space-y-4">
                {bill.class.map((cls) => (
                  <div key={cls.id} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{cls.emoji}</span>
                      <div>
                        <p className="font-medium">{cls.name}</p>
                        <p className="text-sm text-gray-600">Code: {cls.code}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No classes assigned to this bill</p>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}