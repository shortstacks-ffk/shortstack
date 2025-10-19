"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency } from "@/src/lib/utils";
import { format } from "date-fns";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  checking: { id: string; balance: number };
  savings: { id: string; balance: number };
}

interface AddFundsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedStudents: Student[];
  onComplete: () => void;
}

export default function AddFundsDialog({ 
  open, 
  onClose, 
  selectedStudents, 
  onComplete 
}: AddFundsDialogProps) {
  const [amount, setAmount] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [description, setDescription] = useState("");
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [recurrence, setRecurrence] = useState("once");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setAmount("");
    setAccountType("checking");
    setDescription("");
    setIssueDate(new Date());
    setRecurrence("once");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Get today's date for minimum date constraint
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Invalid amount", {
        description: "Please enter a valid amount greater than zero."
      });
      return;
    }

    // Validate issue date is not in the past
    const selectedDate = new Date(issueDate);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // Reset time for comparison
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < todayDate) {
      toast.error("Invalid date", {
        description: "Issue date cannot be in the past."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Create a proper date object for the selected issue date
      const submitDate = new Date(issueDate);
      // Set to noon for better calendar visibility
      submitDate.setHours(12, 0, 0, 0);

      const response = await fetch('/api/teacher/banking/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudents.map(s => s.id),
          accountType,
          amount: parseFloat(amount),
          description: description || `Funds added by teacher`,
          issueDate: submitDate.toISOString(),
          recurrence: recurrence,
          timezone: userTimezone, // Send user's timezone
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add funds");
      }

      const result = await response.json();
      toast.success("Funds operation scheduled successfully", {
        description: result.message
      });
      
      handleClose();
      onComplete();
    } catch (error) {
      console.error("Error adding funds:", error);
      toast.error("Error adding funds", {
        description: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Funds</DialogTitle>
          <DialogDescription>
            Add funds to {selectedStudents.length} selected student{selectedStudents.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Enter a description for this transaction"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Account Type</Label>
            <RadioGroup value={accountType} onValueChange={setAccountType} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="checking" id="checking" />
                <Label htmlFor="checking">Checking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="savings" id="savings" />
                <Label htmlFor="savings">Savings</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-date">Issue on</Label>
            <Input
              id="issue-date"
              type="date"
              min={todayStr} // Prevent selecting past dates
              value={format(issueDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  // Create date from the input value (which is in YYYY-MM-DD format)
                  // Use local timezone interpretation
                  const newDate = new Date(e.target.value + 'T12:00:00');
                  setIssueDate(newDate);
                }
              }}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="recurrence">Set</Label>
            <div className="flex items-center gap-2">
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select recurrence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">one time</SelectItem>
                  <SelectItem value="weekly">weekly</SelectItem>
                  <SelectItem value="biweekly">bi-weekly</SelectItem>
                  <SelectItem value="monthly">monthly</SelectItem>
                </SelectContent>
              </Select>
              
              <span className="text-sm">fee of</span>
              
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 mt-4">
              This will add {formatCurrency(parseFloat(amount) || 0)} to the {accountType} account of each selected student
              {recurrence !== 'once' ? ` on a ${recurrence} basis starting ` : ' on '}
              {format(issueDate, 'PPP')}.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Add Funds"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}