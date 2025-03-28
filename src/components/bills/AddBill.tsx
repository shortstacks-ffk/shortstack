"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import { createBill } from "@/src/app/actions/billActions"
import { Button } from "@/src/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { toast } from "react-hot-toast"
import { Loader2 } from "lucide-react";

type AddBillProps = {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
};

// Add Class interface
interface ClassItem {
  id: string;
  name: string;
  code: string;
  emoji: string;
  studentCount: number;
}

const AddBill = ({ isOpen, onClose, onSuccess }: AddBillProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedEmoji, setSelectedEmoji] = useState("💰");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for classes
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // Fetch classes when component mounts
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setIsLoadingClasses(true);
        const response = await fetch('/api/classes');
        
        if (response.ok) {
          const data = await response.json();
          setClasses(data.classes || []);
        } else {
          console.error("Failed to fetch classes");
          toast.error("Couldn't load your classes");
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      } finally {
        setIsLoadingClasses(false);
      }
    };

    if (isOpen) {
      fetchClasses();
    }
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setSelectedEmoji(emojiData.emoji);
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const clientAction = async (formData: FormData) => {
    try {
      // Validate that at least one class is selected
      if (selectedClassIds.length === 0) {
        toast.error("Please select at least one class");
        return;
      }
      
      setIsSubmitting(true);
      
      // Add selected class IDs to the form data
      selectedClassIds.forEach(classId => {
        formData.append("classIds", classId);
      });
      
      const result = await createBill(formData);

      if (!result.success) {
        toast.error(result.error || "Failed to create bill");
      } else {
        toast.success("Bill created successfully!");
        formRef.current?.reset();
        setSelectedEmoji("💰");
        setSelectedClassIds([]);
        
        // Force a router refresh
        router.refresh();
        
        // Close dialog and trigger success callback
        onSuccess?.();
        onClose?.();
      }
    } catch (error) {
      toast.error("Failed to create bill");
      console.error("Create bill error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !isSubmitting && !open && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Bill</DialogTitle>
        </DialogHeader>
        
        <form ref={formRef} action={clientAction} className="space-y-4">
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="text-2xl h-14 w-14">
                  {selectedEmoji}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </PopoverContent>
            </Popover>
            
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

          {/* Class selection section */}
          <div>
            <Label className="mb-2 block">Select Classes</Label>
            {isLoadingClasses ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            ) : classes.length === 0 ? (
              <div className="text-center py-2 text-gray-500">
                No classes available. Create a class first.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border rounded p-2">
                {classes.map(cls => (
                  <div 
                    key={cls.id} 
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 mb-1 ${
                      selectedClassIds.includes(cls.id) ? "bg-blue-100" : ""
                    }`}
                    onClick={() => toggleClassSelection(cls.id)}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedClassIds.includes(cls.id)}
                      onChange={() => toggleClassSelection(cls.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-xl mr-1">{cls.emoji}</span>
                    <span>{cls.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {cls.studentCount} students
                    </span>
                  </div>
                ))}
              </div>
            )}
            {selectedClassIds.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                Please select at least one class
              </p>
            )}
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
              disabled={isSubmitting || selectedClassIds.length === 0}
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