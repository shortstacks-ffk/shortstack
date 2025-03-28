"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { deleteBill } from "@/src/app/actions/billActions";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  billId: string;
  billTitle: string;
}

export default function DeleteBillDialog({
  isOpen,
  onClose,
  billId,
  billTitle
}: DeleteBillDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteBill(billId);

      if (result.success) {
        toast.success("Bill deleted successfully");
        router.refresh();
        onClose();
      } else {
        toast.error(result.error || "Failed to delete bill");
      }
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast.error("An error occurred while deleting the bill");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !isDeleting && !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Bill</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center text-amber-600 mb-4 p-3 bg-amber-50 rounded-md">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>This action cannot be undone</p>
          </div>
          
          <p className="text-gray-700">
            Are you sure you want to delete the bill "{billTitle}"? This will remove the bill from all classes.
          </p>

          <div className="flex justify-end gap-2 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
              className="min-w-[100px]"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Bill"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}