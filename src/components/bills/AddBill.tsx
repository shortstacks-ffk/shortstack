"use client"

import { useState, useEffect, useRef } from "react";
import { createBill } from "@/src/app/actions/billActions";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Button } from "@/src/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmojiPickerButton } from "@/src/components/ui/emoji-picker-button";

type AddBillProps = {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
};

const AddBill = ({ isOpen = false, onClose, onSuccess }: AddBillProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedEmoji, setSelectedEmoji] = useState("💰");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedEmoji("💰");
      formRef.current?.reset();
    }
  }, [isOpen]);

  const handleDialogChange = (open: boolean) => {
    if (!open && !isSubmitting && onClose) {
      onClose();
    }
  };

  const clientAction = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      
      // Get the date value and create a proper Date object in local timezone
      const dueDateString = formData.get("dueDate") as string;
      if (dueDateString) {
        // Create a new Date object at midnight local time
        const localDate = new Date(dueDateString + 'T00:00:00');
        
        // Update the formData with the proper date
        formData.set("dueDate", localDate.toISOString());
      }
      
      const result = await createBill(formData);

      if (!result.success) {
        toast.error(result.error || "Failed to create bill");
      } else {
        toast.success("Bill created successfully!");
        formRef.current?.reset();
        setSelectedEmoji("💰");
        
        // Force a router refresh
        router.refresh();
        
        // Close dialog and trigger success callback
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }
    } catch (error) {
      toast.error("Failed to create bill");
      console.error("Create bill error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Bill</DialogTitle>
        </DialogHeader>
        
        <form ref={formRef} action={clientAction} className="space-y-4">
          <div className="flex items-center gap-3">
            <EmojiPickerButton 
              value={selectedEmoji}
              onChange={(emoji) => {
                setSelectedEmoji(emoji);
              }}
              className="text-2xl h-14 w-14"
            />
            
            <Input
              name="title"
              placeholder="Bill title"
              className="flex-1"
              required
              disabled={isSubmitting}
            />
            
            <input type="hidden" name="emoji" value={selectedEmoji} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                min={todayString} // Prevent past dates
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <select
              id="frequency"
              name="frequency"
              className="w-full p-2 border rounded"
              required
              disabled={isSubmitting}
            >
              <option value="ONCE">One Time</option>
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Bi-weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <textarea
              id="description"
              name="description"
              className="w-full p-2 border rounded"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="py-2 text-gray-600 text-sm">
            <p>This bill will be created without assigning to any class or student.</p>
            <p className="mt-1">You can assign it to classes or students later from the bill details page.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : "Create Bill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBill;