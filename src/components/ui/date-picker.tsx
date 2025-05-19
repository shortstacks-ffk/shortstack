"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/src/lib/utils"
import { Button } from "@/src/components/ui/button"
import { Calendar } from "@/src/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover"

interface DatePickerProps {
  value: Date
  onChange: (date: Date) => void
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  // Handle date selection and close the popover
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Preserve the time from the original value
      const newDate = new Date(date)
      newDate.setHours(
        value.getHours(),
        value.getMinutes(),
        value.getSeconds(),
        value.getMilliseconds()
      )
      onChange(newDate)
      setOpen(false) // Close the popover after selection
    }
  }
 
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "MMM d, yyyy") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}