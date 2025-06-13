import { getBill } from "@/src/app/actions/billActions";
import { notFound } from "next/navigation";
import { StudentBillDetailClient } from "./StudentBillDetailClient";

type PageProps = {
  params: Promise<{ billId: string }>;
};

export default async function StudentBillDetailPage({ params }: PageProps) {
  const { billId } = await params;
  
  const response = await getBill(billId);

  if (!response.success || !response.data) {
    return notFound();
  }

  return <StudentBillDetailClient bill={response.data} />;
}