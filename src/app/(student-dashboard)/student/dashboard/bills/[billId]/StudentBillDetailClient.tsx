"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import Link from "next/link";
import { ChevronLeft, AlertCircle, CalendarDays, Clock, Receipt } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import { useState } from "react";
import PayBillDialog from "@/src/components/banking/PayBillDialog";

interface StudentBillDetailClientProps {
  bill: any;
  accounts?: any[];
}

interface PayBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: any[];
  onPaymentComplete?: () => void;
}

export function StudentBillDetailClient({ bill, accounts = [] }: StudentBillDetailClientProps) {
  const [showPayDialog, setShowPayDialog] = useState(false);
  
  // Format functions
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };
  
  const formatFrequency = (freq: string) => {
    switch (freq) {
      case "ONCE": return "One Time";
      case "WEEKLY": return "Weekly";
      case "BIWEEKLY": return "Bi-weekly";
      case "MONTHLY": return "Monthly";
      case "QUARTERLY": return "Quarterly";
      case "YEARLY": return "Yearly";
      default: return freq;
    }
  };
  
  // Bill status calculations
  const dueDate = new Date(bill.dueDate);
  const now = new Date();
  const isPaid = bill.studentBill?.isPaid;
  const paidAmount = bill.studentBill?.paidAmount || 0;
  
  // Days overdue or remaining
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;
  const daysOverdue = Math.abs(daysUntilDue);
  
  // Payment progress
  const percentPaid = bill.amount > 0 ? Math.min(100, Math.round((paidAmount / bill.amount) * 100)) : 0;
  const remainingAmount = Math.max(0, bill.amount - paidAmount);
  
  // Status badges
  let statusBadge;
  if (isPaid) {
    statusBadge = <Badge variant="default">Paid</Badge>;
  } else if (isOverdue) {
    statusBadge = <Badge variant="destructive">{daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} late</Badge>;
  } else if (daysUntilDue === 0) {
    statusBadge = <Badge variant="outline">Due today</Badge>;
  } else {
    statusBadge = <Badge variant="outline">{daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'} left</Badge>;
  }
  
  // Calculate next occurrences for recurring bills
  const getNextOccurrences = () => {
    if (bill.frequency === "ONCE") return [];
    
    const occurrences: Date[] = [];
    const startDate = new Date(bill.dueDate);
    
    for (let i = 1; i <= 3; i++) {
      const nextDate = new Date(startDate);
      
      switch (bill.frequency) {
        case "WEEKLY":
          nextDate.setDate(nextDate.getDate() + (7 * i));
          break;
        case "BIWEEKLY":
          nextDate.setDate(nextDate.getDate() + (14 * i));
          break;
        case "MONTHLY":
          nextDate.setMonth(nextDate.getMonth() + i);
          // Handle month-end cases (like January 31 -> February 28)
          const originalDay = startDate.getDate();
          const lastDayOfMonth = new Date(
            nextDate.getFullYear(), 
            nextDate.getMonth() + 1, 
            0
          ).getDate();
          
          if (originalDay > lastDayOfMonth) {
            nextDate.setDate(lastDayOfMonth);
          }
          break;
        case "QUARTERLY":
          nextDate.setMonth(nextDate.getMonth() + (3 * i));
          break;
        case "YEARLY":
          nextDate.setFullYear(nextDate.getFullYear() + i);
          break;
      }
      
      // Only show future dates
      if (nextDate > now) {
        occurrences.push(nextDate);
      }
    }
    
    return occurrences;
  };
  
  const nextOccurrences = getNextOccurrences();
  
  return (
    <main className="container mx-auto p-4">
      <div className="mb-6">
        <Link href="/student/dashboard/bills" className="flex items-center text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span>Back to bills</span>
        </Link>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center">
            <span className="text-4xl mr-3">{bill.emoji}</span>
            <div>
              <h1 className="text-3xl font-bold">{bill.title}</h1>
              <p className="text-gray-600">
                {formatFrequency(bill.frequency)} • Due: {formatDate(bill.dueDate)}
              </p>
            </div>
          </div>
          {statusBadge}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Amount</span>
                <span className="font-medium">{formatCurrency(bill.amount)}</span>
              </div>
              
              {paidAmount > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Paid</span>
                    <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Remaining</span>
                    <span className="font-medium text-amber-600">{formatCurrency(remainingAmount)}</span>
                  </div>
                </>
              )}
              
              {/* Payment progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-sm">Payment progress</span>
                  <span className="text-sm font-medium">{percentPaid}%</span>
                </div>
                <Progress value={percentPaid} className="h-2" />
              </div>
              
              {/* Payment CTA button */}
              <Button 
                onClick={() => setShowPayDialog(true)}
                className="w-full mt-2" 
                disabled={isPaid || bill.status === "CANCELLED"}
              >
                {isPaid ? 'Paid' : 'Pay Bill'}
              </Button>
              
              {bill.studentBill?.paidAt && (
                <div className="text-sm text-center text-gray-500">
                  Paid on {formatDate(bill.studentBill.paidAt)}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Bill Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <CalendarDays className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Due Date</p>
                  <p className="text-gray-600">{formatDate(bill.dueDate)}</p>
                </div>
              </div>
              
              {bill.class && bill.class[0] && (
                <div className="flex items-start gap-2">
                  <div className="text-xl mt-0.5">{bill.class[0].emoji}</div>
                  <div>
                    <p className="font-medium">Class</p>
                    <p className="text-gray-600">{bill.class[0].name}</p>
                  </div>
                </div>
              )}
              
              {bill.frequency !== "ONCE" && (
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Frequency</p>
                    <p className="text-gray-600">{formatFrequency(bill.frequency)}</p>
                  </div>
                </div>
              )}
              
              {bill.description && (
                <div className="border-t pt-4 mt-4">
                  <p className="font-medium mb-1">Description</p>
                  <p className="text-gray-600 whitespace-pre-wrap">{bill.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {bill.frequency !== "ONCE" && nextOccurrences.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Upcoming Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {nextOccurrences.map((date, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-gray-500" />
                      <span>{formatDate(date)}</span>
                    </div>
                    <Badge variant="outline">Upcoming</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <PayBillDialog
        isOpen={showPayDialog}
        onClose={() => setShowPayDialog(false)}
        accounts={accounts}
        onPaymentComplete={() => window.location.reload()}
      />
    </main>
  );
}