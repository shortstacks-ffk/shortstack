'use client'

import { useState } from "react"
import { Button } from "@/src/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog"
import { Input } from "@/src/components/ui/input"
import { Switch } from "@/src/components/ui/switch"
import { Textarea } from "@/src/components/ui/textarea"
import { updateStoreItem } from "@/src/app/actions/storeFrontActions"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import EmojiPicker, { EmojiClickData } from "emoji-picker-react"

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
  const [formData, setFormData] = useState({
    name: itemData.name,
    emoji: itemData.emoji,
    price: itemData.price,
    description: itemData.description || '',
    quantity: itemData.quantity,
    isAvailable: itemData.isAvailable,
  })

  const handleUpdate = async () => {
    const result = await updateStoreItem(itemData.id, formData)
    if (result.success) {
      onClose()
    }
  }

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setFormData(prev => ({ ...prev, emoji: emojiData.emoji }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update Store Item</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="name">Item Name</label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="price">Price</label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="quantity">Quantity</label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
              />
            </div>

            <div className="grid gap-2">
              <label>Item Emoji</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full text-2xl">
                    {formData.emoji}
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

            <div className="col-span-2 grid gap-2">
              <label htmlFor="description">Description</label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="col-span-2 flex items-center justify-between">
              <label htmlFor="isAvailable">Available for Purchase</label>
              <Switch
                id="isAvailable"
                checked={formData.isAvailable}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpdate}>Update Item</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}