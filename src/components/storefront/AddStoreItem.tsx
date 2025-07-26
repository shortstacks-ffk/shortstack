"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/src/components/ui/textarea";
import { Switch } from "@/src/components/ui/switch";
import { EmojiPickerButton } from "@/src/components/ui/emoji-picker-button";

import { createStoreItem } from "@/src/app/actions/storeFrontActions";

type AddStoreItemProps = {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
};

const AddStoreItem = ({ isOpen = false, onClose, onSuccess }: AddStoreItemProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedEmoji, setSelectedEmoji] = useState("🛍️");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for availability
  const [isAvailableChecked, setIsAvailableChecked] = useState(true);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedEmoji("🛍️");
      formRef.current?.reset();
      setIsAvailableChecked(true);
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

      // Add emoji to form data
      formData.set("emoji", selectedEmoji);

      // Handle isAvailable explicitly
      formData.set("isAvailable", isAvailableChecked ? "true" : "false");

      const result = await createStoreItem(formData);

      if (!result.success) {
        toast.error(result.error || "Failed to create store item");
      } else {
        toast.success("Store item created successfully!");
        formRef.current?.reset();
        setSelectedEmoji("🛍️"); // Reset emoji

        // Force a router refresh
        router.refresh();

        // Close dialog and trigger success callback
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }
    } catch (error) {
      toast.error("Failed to create store item");
      console.error("Create store item error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleDialogChange}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create a New Store Item</DialogTitle>
        </DialogHeader>

        <form ref={formRef} action={clientAction} className="space-y-4">
          {/* Title and emoji picker - similar to bill layout */}
          <div className="flex items-center gap-3">
            <Input
              name="name"
              placeholder="Item name"
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
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                step="1"
                defaultValue="1"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Item Description"
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isAvailable"
              checked={isAvailableChecked}
              onCheckedChange={setIsAvailableChecked}
            />
            <Label htmlFor="isAvailable">Available for Purchase</Label>
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
                       ) : "Create Item"}
                     </Button>
                   </DialogFooter>
                 </form>
               </DialogContent>
    </Dialog>
  );
};

export default AddStoreItem;
