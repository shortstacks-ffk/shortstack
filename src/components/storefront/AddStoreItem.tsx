// "use client"

// import { useState, useRef } from "react"
// import EmojiPicker, { type EmojiClickData } from "emoji-picker-react"
// import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
// import { Button } from "@/src/components/ui/button"
// import { Input } from "@/src/components/ui/input"
// import { Label } from "@/src/components/ui/label"
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog"
// import { createStoreItem } from "@/src/app/actions/storeFrontActions"
// import { toast } from "react-toastify"
// import { Textarea } from "@/src/components/ui/textarea"
// import { Switch } from "@/src/components/ui/switch"

// type AddStoreItemProps = {
//   isOpen?: boolean;
//   onClose?: () => void;
//   onSuccess?: () => void;
//   classId: string;
// };

// const AddStoreItem = ({ isOpen, onClose, onSuccess, classId }: AddStoreItemProps) => {
//   const formRef = useRef<HTMLFormElement>(null);
//   const [selectedEmoji, setSelectedEmoji] = useState("🛍️")

//   const clientAction = async (formData: FormData) => {
//     try {
//       // Add classId to formData
//       formData.append("classId", classId);
      
//       const result = await createStoreItem(formData);

//       if (!result.success) {
//         toast.error(result.error || "Failed to create store item");
//       } else {
//         toast.success("Store item created successfully!");
//         formRef.current?.reset();
//         setSelectedEmoji("🛍️"); // Reset emoji
//         onSuccess?.();
//         onClose?.();
//       }
//     } catch (error) {
//       toast.error("Failed to create store item");
//       console.error("Create store item error:", error);
//     }
//   }

//   const onEmojiClick = (emojiData: EmojiClickData) => {
//     setSelectedEmoji(emojiData.emoji)
//   }

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="max-w-2xl">
//         <DialogHeader>
//           <DialogTitle>Add New Store Item</DialogTitle>
//         </DialogHeader>
//         <form ref={formRef} action={clientAction} className="space-y-4">
//           <div className="grid grid-cols-2 gap-4">
//             <div className="space-y-2">
//               <Label htmlFor="name">Item Name</Label>
//               <Input id="name" name="name" placeholder="Item Name" required />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="price">Price</Label>
//               <Input 
//                 id="price" 
//                 name="price" 
//                 type="number" 
//                 min="0"
//                 step="0.01"
//                 placeholder="0.00" 
//                 required 
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="quantity">Quantity Available</Label>
//               <Input 
//                 id="quantity" 
//                 name="quantity" 
//                 type="number" 
//                 min="0"
//                 step="1"
//                 defaultValue="1"
//                 required 
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="isAvailable">Available for Purchase</Label>
//               <div className="flex items-center space-x-2">
//                 <Switch 
//                   id="isAvailable" 
//                   name="isAvailable"
//                   defaultChecked
//                 />
//                 <Label htmlFor="isAvailable">Available</Label>
//               </div>
//             </div>

//             <div className="col-span-2 space-y-2">
//               <Label htmlFor="description">Description</Label>
//               <Textarea 
//                 id="description" 
//                 name="description" 
//                 placeholder="Item Description"
//                 className="min-h-[100px]"
//               />
//             </div>

//             <div className="space-y-2">
//               <Label>Item Emoji</Label>
//               <input type="hidden" name="emoji" value={selectedEmoji} />
//               <Popover>
//                 <PopoverTrigger asChild>
//                   <Button variant="outline" className="w-full text-2xl h-10">
//                     {selectedEmoji}
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent className="w-80 p-0">
//                   <EmojiPicker 
//                     onEmojiClick={onEmojiClick} 
//                     autoFocusSearch={false} 
//                   />
//                 </PopoverContent>
//               </Popover>
//             </div>
//           </div>

//           <div className="flex justify-end space-x-4 mt-6">
//             <Button 
//               type="button" 
//               variant="outline" 
//               onClick={onClose}
//             >
//               Cancel
//             </Button>
//             <Button type="submit">
//               Create Item
//             </Button>
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   )
// }

// export default AddStoreItem

"use client"

import { useState, useRef } from "react"
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog"
import { createStoreItem } from "@/src/app/actions/storeFrontActions"
import { toast } from "react-toastify"
import { Textarea } from "@/src/components/ui/textarea"
import { Switch } from "@/src/components/ui/switch"

type AddStoreItemProps = {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
};

const AddStoreItem = ({ isOpen, onClose, onSuccess}: AddStoreItemProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedEmoji, setSelectedEmoji] = useState("🛍️")

  const clientAction = async (formData: FormData) => {
    try {
      // Add classId to formData
      // formData.append("classId", classId);
      
      const result = await createStoreItem(formData);

      if (!result.success) {
        toast.error(result.error || "Failed to create store item");
      } else {
        toast.success("Store item created successfully!");
        formRef.current?.reset();
        setSelectedEmoji("🛍️"); // Reset emoji
        onSuccess?.();
        onClose?.();
      }
    } catch (error) {
      toast.error("Failed to create store item");
      console.error("Create store item error:", error);
    }
  }

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setSelectedEmoji(emojiData.emoji)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Store Item</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={clientAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input id="name" name="name" placeholder="Item Name" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input 
                id="price" 
                name="price" 
                type="number" 
                min="0"
                step="0.01"
                placeholder="0.00" 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity Available</Label>
              <Input 
                id="quantity" 
                name="quantity" 
                type="number" 
                min="0"
                step="1"
                defaultValue="1"
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isAvailable">Available for Purchase</Label>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="isAvailable" 
                  name="isAvailable"
                  defaultChecked
                />
                <Label htmlFor="isAvailable">Available</Label>
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Item Description"
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Item Emoji</Label>
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
              Create Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddStoreItem