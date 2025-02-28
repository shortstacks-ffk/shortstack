"use client";

import * as React from "react";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Bill } from "@/src/models/bill-model";
import { Calendar, DollarSign, Clock, Plus } from "lucide-react";

interface BillGridProps {
  bills: Bill[];
  onAddBill: () => void;
}

export function BillGrid({ bills, onAddBill }: BillGridProps) {
  const getColumnIndex = (index, totalItems) => {
    const row = Math.floor(index / 3);
    return index - (row * 3);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  return (
    <div className="flex flex-col min-h-screen px-20 p-4 bg-gray-50">
      <div className="flex justify-between items-center max-w-4xl mx-auto w-full mb-8 mt-[15%]">
        <h1 className="text-4xl font-bold">Bills</h1>
        <div className="flex gap-4">
          <Button
            onClick={onAddBill}
            className="bg-[#6F7C8E] text-white w-32 h-10 rounded-[15px] hover:bg-[#5C6A7B]"
          >
            Add Bill
          </Button>
          <Button className="bg-[#6F7C8E] text-white w-32 h-10 rounded-[15px] hover:bg-[#5C6A7B]">
            Edit Bill
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bills.map((bill, index) => (
            <Card
              key={bill.id}
              className={`grid-column w-[250px] h-[250px] rounded-xl flex flex-col ${
                getColumnIndex(index, bills.length) === 0
                  ? "bg-[#009245]"
                  : getColumnIndex(index, bills.length) === 1
                  ? "bg-[#F57600]"
                  : "bg-[#E63A93]"
              }`}
            >
              <CardHeader>
                <CardTitle className="text-white">{bill.title}</CardTitle>
                <CardDescription className="text-white/80">
                  {formatCurrency(bill.amount)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4 mt-8">
                  <div className="flex items-center space-x-2">
                    <Calendar className="text-xl text-white" />
                    <p className="text-sm text-white">Due: {formatDate(bill.dueDate)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="text-xl text-white" />
                    <p className="text-sm text-white">{bill.frequency}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      bill.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      bill.status === 'PAID' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {bill.status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Bill Card */}
          <Card className="border-4 border-solid border-gray-400 w-[250px] h-[250px] rounded-xl bg-muted/80 flex flex-col justify-center items-center">
            <CardContent className="flex flex-col items-center justify-center w-full h-full pt-10">
              <div
                className="rounded-full bg-primary/35 p-2 text-primary/40 w-[80px] h-[80px] mx-2 my-2 cursor-pointer hover:bg-primary/50 transition-colors duration-300"
                onClick={onAddBill}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onAddBill()}
              >
                <Plus className="mx-2 my-2 w-12 h-12 object-center" />
              </div>
            </CardContent>
            <CardContent className="relative flex flex-col items-center">
              <div className="w-[130px] h-[20px] rounded-xl bg-primary/10 text-primary/60 px-7">
                Add Bill
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}