"use client"

import { useState, useEffect, useRef } from "react";
import { createBill } from "@/src/app/actions/billActions";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/src/components/ui/dialog";
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

  // Timezone-safe date formatting helper
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Get today's date in YYYY-MM-DD format in local timezone
  const getTodayDateString = () => {
    const today = new Date();
    return formatDateForInput(today);
  };

  const clientAction = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      
      // Better timezone handling for the due date
      const dueDateString = formData.get("dueDate") as string;
      if (dueDateString) {
        // Create a date using the components to avoid timezone shifts
        const [year, month, day] = dueDateString.split('-').map(Number);
        const localDate = new Date(year, month - 1, day, 12, 0, 0); // Setting to noon for better visibility
        
        // Update the formData with the proper ISO string
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

  const todayString = getTodayDateString();

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleDialogChange}
    >
      <DialogContent className="max-w-md bg-background">
        <DialogHeader>
          <DialogTitle>Create A New Bill</DialogTitle>
        </DialogHeader>
        
        <form ref={formRef} action={clientAction} className="space-y-4">
          {/* Updated layout with emoji picker on the right correctly aligned */}
          <div className="flex items-center gap-3">
            <Input
              name="title"
              placeholder="Bill title"
              className="flex-1"
              required
              disabled={isSubmitting}
            />
            
            <div className="shrink-0">
              <EmojiPickerButton 
                value={selectedEmoji}
                onChange={(emoji) => {
                  setSelectedEmoji(emoji);
                }}
                className="text-2xl h-14 w-14"
              />
            </div>
            
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
                min={todayString}
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

          <DialogFooter className="pt-2 border-t">
            <Button 
              type="button" 
              variant="outline"
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBill;