"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { formatCurrency } from "@/src/lib/utils";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { AlertCircle, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/src/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { format } from "date-fns";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  checking: { id: string; balance: number };
  savings: { id: string; balance: number };
}

interface RemoveFundsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedStudents: Student[];
  onComplete: () => void;
}

export default function RemoveFundsDialog({ 
  open, 
  onClose, 
  selectedStudents, 
  onComplete 
}: RemoveFundsDialogProps) {
  const [amount, setAmount] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [description, setDescription] = useState("");
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [recurrence, setRecurrence] = useState("once");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState<string[]>([]);

  const resetForm = () => {
    setAmount("");
    setAccountType("checking");
    setDescription("");
    setIssueDate(new Date());
    setRecurrence("once");
    setInsufficientFunds([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Check which students have insufficient funds
  const checkInsufficientFunds = () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return [];
    
    return selectedStudents
      .filter(student => {
        const accountBalance = accountType === "checking" 
          ? student.checking.balance 
          : student.savings.balance;
        return accountBalance < parsedAmount;
      })
      .map(student => `${student.firstName} ${student.lastName}`);
  };

  // Update insufficient funds list when inputs change
  const updateInsufficientFunds = () => {
    const insufficientList = checkInsufficientFunds();
    setInsufficientFunds(insufficientList);
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (selectedStudents.length > 0) {
      setTimeout(updateInsufficientFunds, 100);
    }
  };

  const handleAccountTypeChange = (value: string) => {
    setAccountType(value);
    if (selectedStudents.length > 0 && amount) {
      setTimeout(updateInsufficientFunds, 100);
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Invalid amount", {
        description: "Please enter a valid amount greater than zero."
      });
      return;
    }

    // Check for insufficient funds
    const insufficientList = checkInsufficientFunds();
    if (insufficientList.length > 0) {
      toast.error("Insufficient funds", {
        description: "Some students have insufficient funds for this operation."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/teacher/banking/remove-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudents.map(s => s.id),
          accountType,
          amount: parseFloat(amount),
          description: description || `Funds removed by teacher`,
          issueDate: issueDate.toISOString(),
          recurrence: recurrence,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove funds");
      }

      toast.success("Funds removed successfully", {
        description: `Removed ${formatCurrency(parseFloat(amount))} from ${selectedStudents.length} student(s).`
      });
      
      handleClose();
      onComplete();
    } catch (error) {
      console.error("Error removing funds:", error);
      toast.error("Error removing funds", {
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
          <DialogTitle>Remove Funds</DialogTitle>
          <DialogDescription>
            Remove funds from {selectedStudents.length} selected student{selectedStudents.length !== 1 ? "s" : ""}.
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
            <RadioGroup 
              value={accountType} 
              onValueChange={handleAccountTypeChange} 
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="checking" id="checking_remove" />
                <Label htmlFor="checking_remove">Checking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="savings" id="savings_remove" />
                <Label htmlFor="savings_remove">Savings</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-date">Issue on</Label>
            <div className="flex gap-2">
              <Input
                id="issue-date"
                type="date"
                className="flex-1"
                min={new Date().toISOString().split('T')[0]} // Prevents selecting dates in the past
                value={issueDate ? issueDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : new Date();
                  // Set the time to current time to ensure it's valid
                  newDate.setHours(new Date().getHours(), new Date().getMinutes());
                  setIssueDate(newDate);
                }}
              />
              
            </div>
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
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          {insufficientFunds.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The following students have insufficient funds: 
                {insufficientFunds.join(", ")}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <p className="text-sm text-gray-500 mt-4">
              This will remove {formatCurrency(parseFloat(amount) || 0)} from the {accountType} account of each selected student
              {recurrence !== 'once' ? ` on a ${recurrence} basis starting ` : ' on '}
              {format(issueDate, 'PPP')}.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button 
            variant="default" 
            onClick={handleSubmit} 
            disabled={isSubmitting || insufficientFunds.length > 0}
          >
            {isSubmitting ? "Processing..." : "Remove Funds"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}