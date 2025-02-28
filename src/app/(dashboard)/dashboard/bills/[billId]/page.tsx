import { getBillData } from '@/src/app/actions/billActions';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';


export default async function BillPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId } = await params;
  const billData = await getBillData(billId);
  
  if (!billData) {
    notFound();
  }

  return (
    <main className="container mx-auto p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <div className="container mx-auto p-6">
          <h1 className="text-2xl font-bold mb-6">
            {billData.emoji} {billData.name}
          </h1>
        </div>
      </Suspense>
    </main>
  );
}