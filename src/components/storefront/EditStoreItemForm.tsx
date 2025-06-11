'use client'

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/src/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Switch } from "@/src/components/ui/switch"
import { Textarea } from "@/src/components/ui/textarea"
import { updateStoreItem } from "@/src/app/actions/storeFrontActions"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { EmojiPickerButton } from "@/src/components/ui/emoji-picker-button"

interface EditStoreItemFormProps {
  isOpen: boolean
  onClose: () => void
  itemData: {
    id: string
    name: string
    emoji: string
    price: number
    description?: string
    quantity: number
    isAvailable: boolean
  }
}

export function EditStoreItemForm({ isOpen, onClose, itemData }: EditStoreItemFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [title, setTitle] = useState(itemData.name)
  const [emoji, setEmoji] = useState(itemData.emoji || "🛍️")
  const [price, setPrice] = useState(itemData.price.toString())
  const [quantity, setQuantity] = useState(itemData.quantity.toString())
  const [description, setDescription] = useState(itemData.description || '')
  const [isAvailable, setIsAvailable] = useState(itemData.isAvailable)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !price) {
      toast.error("Please fill all required fields")
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await updateStoreItem(itemData.id, {
        name: title,
        emoji: emoji,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        description: description,
        isAvailable: isAvailable
      })
      
      if (result.success) {
        toast.success("Store item updated successfully")
        router.refresh()
        onClose()
      } else {
        toast.error(result.error || "Failed to update store item")
      }
    } catch (error) {
      console.error("Error updating store item:", error)
      toast.error("An error occurred while updating the store item")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Store Item</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title and emoji picker - same layout as bills */}
          <div className="flex items-center gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Item name"
              className="flex-1"
              required
              disabled={isSubmitting}
            />
            
            <div className="shrink-0">
              <EmojiPickerButton 
                value={emoji}
                onChange={setEmoji}
                className="text-2xl h-14 w-14"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                type="number"
                min="0"
                step="1"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Item Description"
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isAvailable"
              checked={isAvailable}
              onCheckedChange={setIsAvailable}
              disabled={isSubmitting}
            />
            <Label htmlFor="isAvailable">Available for Purchase</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
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
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}