"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";
import { toast } from "sonner";
import { Ban, Loader2 } from "lucide-react";
import { cancelBill } from "@/src/app/actions/billActions";

interface CancelBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  billId: string;
  billTitle: string;
}

export default function CancelBillDialog({
  isOpen,
  onClose,
  billId,
  billTitle
}: CancelBillDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const result = await cancelBill(billId, reason);
      
      if (result.success) {
        toast.success("Bill cancelled successfully");
        onClose();
        setReason("");
      } else {
        toast.error(result.error || "Failed to cancel bill");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-orange-600" />
            Cancel Bill
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel "{billTitle}"? This action will prevent any new payments and notify students.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Cancellation Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for cancellation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Keep Bill
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <Ban className="mr-2 h-4 w-4" />
                Cancel Bill
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}