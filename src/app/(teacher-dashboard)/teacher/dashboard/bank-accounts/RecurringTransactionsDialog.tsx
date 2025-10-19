"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { formatCurrency } from "@/src/lib/utils";
import { toast } from "sonner";
import { CalendarX, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface RecurringTransaction {
  id: string;
  title: string;
  description: string;
  startDate: string;
  recurrenceType: string;
  recurrenceInterval: number;
  metadata: {
    transactionType: string;
    studentId: string;
    accountType: string;
    amount: number;
  };
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

interface RecurringTransactionsDialogProps {
  open: boolean;
  onClose: () => void;
  studentId?: string; // Optional: if provided, only show transactions for this student
  students: Student[];
  onComplete: () => void;
}

export default function RecurringTransactionsDialog({
  open,
  onClose,
  studentId,
  students,
  onComplete
}: RecurringTransactionsDialogProps) {
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stoppingId, setStoppingId] = useState<string | null>(null);

  // Fetch recurring transactions when dialog opens
  useEffect(() => {
    if (open) {
      fetchRecurringTransactions();
    }
  }, [open, studentId]);

  const fetchRecurringTransactions = async () => {
    setLoading(true);
    try {
      // Build the API URL based on whether we're filtering by student
      const url = studentId 
        ? `/api/teacher/banking/recurring-transactions?studentId=${studentId}`
        : '/api/teacher/banking/recurring-transactions';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recurring transactions');
      }
      
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
      toast.error('Failed to load recurring transactions');
    } finally {
      setLoading(false);
    }
  };

  const stopRecurringTransaction = async (eventId: string) => {
    setStoppingId(eventId);
    try {
      const response = await fetch('/api/teacher/banking/stop-recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stop recurring transaction');
      }

      toast.success('Recurring transaction stopped');
      // Remove the stopped transaction from the list
      setTransactions(transactions.filter(t => t.id !== eventId));
      
      // Call the onComplete callback to refresh data if needed
      onComplete();
    } catch (error) {
      console.error('Error stopping recurring transaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to stop recurring transaction');
    } finally {
      setStoppingId(null);
    }
  };

  // Helper function to get student name by ID
  const getStudentName = (id: string): string => {
    const student = students.find(s => s.id === id);
    return student ? `${student.firstName} ${student.lastName}` : 'Unknown Student';
  };

  // Helper function to format recurrence type
  const formatRecurrenceType = (type: string, interval: number): string => {
    switch (type) {
      case 'WEEKLY':
        return interval === 1 ? 'Weekly' : 'Bi-weekly';
      case 'MONTHLY':
        return 'Monthly';
      default:
        return 'Custom';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Recurring Transactions</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin h-10 w-10 rounded-full border-4 border-orange-500 border-t-transparent"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center p-6">
            <p className="text-gray-500">No recurring transactions found.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {transactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className="p-4 border rounded-lg bg-white"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">
                      {transaction.metadata.transactionType === 'ADD_FUNDS' ? 'Add Funds' : 'Remove Funds'}:
                      {' '}{formatCurrency(transaction.metadata.amount)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Student: {getStudentName(transaction.metadata.studentId)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Account: {transaction.metadata.accountType.charAt(0).toUpperCase() + transaction.metadata.accountType.slice(1).toLowerCase()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Recurrence: {formatRecurrenceType(transaction.recurrenceType, transaction.recurrenceInterval)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Next date: {format(new Date(transaction.startDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={stoppingId === transaction.id}
                    onClick={() => stopRecurringTransaction(transaction.id)}
                  >
                    {stoppingId === transaction.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarX className="h-4 w-4" />
                    )}
                    <span className="ml-2">Stop</span>
                  </Button>
                </div>
                {transaction.description && (
                  <p className="text-sm mt-2 italic">"{transaction.description}"</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}