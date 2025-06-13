"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { copyStoreItemToClasses } from "@/src/app/actions/storeFrontActions";
import { useRouter } from "next/navigation";

interface ClassItem {
  id: string;
  name: string;
  code: string;
  emoji: string;
}

interface AssignStoreItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  storeItemId: string;
  storeItemTitle: string;
  assignedClasses: Array<{ id: string; name: string; emoji?: string; code?: string }>;
}

export default function AssignStoreItemDialog({
  isOpen,
  onClose,
  storeItemId,
  storeItemTitle,
  assignedClasses = []
}: AssignStoreItemDialogProps) {
  const router = useRouter();
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use useRef instead of state for mounted tracking
  const isMountedRef = useRef(false);

  // Get the IDs of already assigned classes for filtering
  const assignedClassIds = assignedClasses.map(cls => cls.id);
  
  // Set mounted ref on mount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Only fetch classes when dialog opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setSelectedClassIds([]);
      setAllClasses([]);
      setIsLoading(true);
      return;
    }
    
    const fetchClasses = async () => {
      if (!isMountedRef.current) return;
      
      setIsLoading(true);
      setSelectedClassIds([]);
      
      try {
        const response = await fetch("/api/classes");
        if (!response.ok) {
          throw new Error("Failed to fetch classes");
        }
        const data = await response.json();
        
        if (!isMountedRef.current) return;
        
        // Filter out classes that already have this store item
        const availableClasses = data.classes.filter(
          (cls: ClassItem) => !assignedClassIds.includes(cls.id)
        );
        
        setAllClasses(availableClasses);
      } catch (error) {
        console.error("Error fetching classes:", error);
        if (isMountedRef.current) {
          toast.error("Failed to load classes");
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };
    
    fetchClasses();
  }, [isOpen, assignedClassIds.join(',')]);

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSubmit = async () => {
    if (selectedClassIds.length === 0) {
      toast.error("Please select at least one class");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await copyStoreItemToClasses({
        storeItemId,
        targetClassIds: selectedClassIds
      });
      
      if (result.success) {
        toast.success(result.message || "Store item assigned to classes");
        router.refresh(); // This will trigger a server-side re-fetch
        onClose();
      } else {
        toast.error(result.error || "Failed to assign store item to classes");
      }
    } catch (error) {
      console.error("Error assigning store item:", error);
      toast.error("An error occurred while assigning store item");
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
          <DialogTitle>Assign Store Item to Classes</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            Assign "{storeItemTitle}" to these classes:
          </p>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : allClasses.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              {assignedClassIds.length > 0 
                ? "This store item is already assigned to all your classes." 
                : "You don't have any classes yet."}
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto border rounded p-2">
              {allClasses.map(cls => (
                <div
                  key={cls.id}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer mb-1 ${
                    selectedClassIds.includes(cls.id) ? "bg-blue-100" : "hover:bg-gray-50"
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
          )}
          
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedClassIds.length === 0 || allClasses.length === 0}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
