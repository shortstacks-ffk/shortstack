"use client"

import { useState, useRef } from "react"
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"

import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog"
import { createBill } from "@/src/app/actions/billActions"
import { toast } from "react-toastify"
import { Textarea } from "@/src/components/ui/textarea"

type AddBillProps = {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
};

const AddBill = ({ isOpen, onClose, onSuccess }: AddBillProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedEmoji, setSelectedEmoji] = useState("📚")

  const clientAction = async (formData: FormData) => {
    try {
      const result = await createBill(formData);

      if (!result.success) {
        toast.error(result.error || "Failed to create bill");
      } else {
        toast.success("Bill created successfully!");
        formRef.current?.reset();
        setSelectedEmoji("📚"); // Reset emoji
        onSuccess?.();
        onClose?.();
      }
    } catch (error) {
      toast.error("Failed to create bill");
      console.error("Create bill error:", error);
    }
  }

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setSelectedEmoji(emojiData.emoji)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Bill</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={clientAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="Bill Name" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input 
                id="amount" 
                name="amount" 
                type="number" 
                min="0"
                step="0.01"
                placeholder="0.00" 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input 
                id="dueDate" 
                name="dueDate" 
                type="date" 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select name="frequency" defaultValue="ONCE">
                <SelectTrigger>
                  <SelectValue placeholder="Select Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONCE">Once</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="BIWEEKLY">Bi-Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Bill Description"
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Bill Emoji</Label>
              <input type="hidden" name="emoji" value={selectedEmoji} />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full text-2xl h-10">
                    {selectedEmoji}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <EmojiPicker 
                    onEmojiClick={onEmojiClick} 
                    autoFocusSearch={false} 
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Bill
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddBill