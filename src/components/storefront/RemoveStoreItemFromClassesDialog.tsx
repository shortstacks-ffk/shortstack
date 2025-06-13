"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { removeStoreItemFromClasses } from "@/src/app/actions/storeFrontActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";

interface StoreItemClass {
  id: string;
  name: string;
  emoji: string;
  code: string;
}

interface RemoveStoreItemFromClassesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  storeItemId: string;
  storeItemTitle: string;
  assignedClasses: StoreItemClass[];
}

export default function RemoveStoreItemFromClassesDialog({
  isOpen,
  onClose,
  storeItemId,
  storeItemTitle,
  assignedClasses = [],
}: RemoveStoreItemFromClassesDialogProps) {
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isRemovingFromAll, setIsRemovingFromAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  // Use useRef instead of state for mounted tracking
  const isMountedRef = useRef(false);
  
  // Set mounted ref on mount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset selections when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedClassIds([]);
      setIsRemovingFromAll(false);
    }
  }, [isOpen]);

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleRemoveFromAll = async () => {
    setIsSubmitting(true);
    
    try {
      const result = await removeStoreItemFromClasses({
        storeItemId,
        classIds: [] // Empty array = remove from all
      });
      
      if (result.success) {
        toast.success(result.message || "Store item removed from all classes");
        router.refresh(); // This will trigger a server-side re-fetch
        onClose();
      } else {
        toast.error(result.error || "Failed to remove store item");
      }
    } catch (error) {
      console.error("Error removing store item:", error);
      toast.error("An error occurred while removing the store item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFromSelected = async () => {
    if (selectedClassIds.length === 0) {
      toast.error("Please select at least one class");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await removeStoreItemFromClasses({
        storeItemId,
        classIds: selectedClassIds
      });
      
      if (result.success) {
        toast.success(result.message || "Store item removed from selected classes");
        router.refresh(); // This will trigger a server-side re-fetch
        onClose();
      } else {
        toast.error(result.error || "Failed to remove store item");
      }
    } catch (error) {
      console.error("Error removing store item:", error);
      toast.error("An error occurred while removing the store item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unassign Store Item from Classes</DialogTitle>
        </DialogHeader>
        
        {isRemovingFromAll ? (
          <div className="py-4">
            <div className="flex items-center text-amber-600 mb-4 p-3 bg-amber-50 rounded-md">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <p>This will unassign the store item from all classes</p>
            </div>
            
            <p className="text-gray-700 mb-4">
              Are you sure you want to unassign "{storeItemTitle}" from all classes? The store item will still be available in your account.
            </p>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRemovingFromAll(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRemoveFromAll}
                disabled={isSubmitting}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Unassigning...
                  </>
                ) : (
                  "Unassign from All"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Select classes to unassign "{storeItemTitle}" from:
            </p>
            
            {assignedClasses.length > 0 ? (
              <div className="space-y-4">
                <div className="max-h-60 overflow-y-auto border rounded p-2">
                  {assignedClasses.map(cls => (
                    <div
                      key={cls.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer mb-1 ${
                        selectedClassIds.includes(cls.id) ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleToggleClass(cls.id)}
                    >
                      <Checkbox
                        checked={selectedClassIds.includes(cls.id)}
                        onCheckedChange={() => handleToggleClass(cls.id)}
                        className="h-4 w-4"
                      />
                      <span className="text-xl mr-1">{cls.emoji}</span>
                      <span>{cls.name}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {cls.code}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    type="button"
                    size="sm"
                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                    onClick={() => setIsRemovingFromAll(true)}
                  >
                    Unassign from all classes
                  </Button>
                  
                  <div className="text-sm text-gray-500">
                    {selectedClassIds.length} of {assignedClasses.length} selected
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRemoveFromSelected}
                    disabled={isSubmitting || selectedClassIds.length === 0}
                    variant="default"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Unassigning...
                      </>
                    ) : (
                      "Unassign Selected"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                This store item is not assigned to any classes.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}