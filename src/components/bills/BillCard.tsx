'use client'

import React, { useState } from "react";
import { Card } from "@/src/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, CreditCard } from "lucide-react";
import { EditBillForm } from "@/src/components/bills/EditBillForm";
import { deleteBill } from "@/src/app/actions/billActions"
import { useRouter } from "next/navigation";

interface BillCardProps {
  id: string;
  title: string;
  amount: number;
  dueDate: Date;
  frequency: string;
  status: string;
  description?: string;
  backgroundColor: string;
}

export const BillCard = ({ id, title, amount, dueDate, frequency, status, description, backgroundColor }: BillCardProps) => {
  const router = useRouter();
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.dropdown-menu') ||
      (e.target as HTMLElement).closest('[role="dialog"]')
    ) {
      e.stopPropagation();
      return;
    }
    router.push(`/dashboard/bills/${id}`);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this bill? This action cannot be undone.')) {
      await deleteBill(id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(date));
  };

  return (
    <Card className="bg-transparent w-[250px] h-[250px] rounded-xl relative">
      <div
        onClick={handleCardClick}
        className={`${backgroundColor} w-full h-full rounded-xl flex flex-col justify-center items-center cursor-pointer p-4`}
      >
        <div className="absolute top-2 right-2 dropdown-menu" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <MoreHorizontal className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setIsUpdateDialogOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Update
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-4xl mb-4">
          <CreditCard className="h-8 w-8" />
        </div>
        
        <h3 className="text-xl font-semibold text-center">{title}</h3>
        <p className="text-lg font-bold text-primary mt-2">{formatCurrency(amount)}</p>
        <p className="text-sm text-muted-foreground mt-1">Due Date: {formatDate(dueDate)}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs ${
            status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
            status === 'PAID' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {status}
          </span>
          <span className="text-xs text-muted-foreground">{frequency}</span>
        </div>
      </div>

      <div onClick={e => e.stopPropagation()}>
        <EditBillForm
          isOpen={isUpdateDialogOpen}
          onClose={() => setIsUpdateDialogOpen(false)}
          billData={{
            id,
            title,
            amount,
            dueDate,
            frequency,
            status,
            description
          }}
        />
      </div>
    </Card>
  );
};