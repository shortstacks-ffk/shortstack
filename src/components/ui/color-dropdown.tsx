"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "./button"
import { colorOptions } from "@/src/lib/colors"
import { cn } from "@/src/lib/utils"
import { ChevronDown } from "lucide-react"

interface ColorDropdownProps {
  value: string
  onChange: (color: string) => void
  className?: string
}

export function ColorDropdown({ value, onChange, className }: ColorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Use direct mapping from colorOptions for better reliability
  const defaultColor = colorOptions[0]; // blue
  const selectedColor = colorOptions.find(c => c.value === value) || defaultColor;
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])
  
  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <Button 
        type="button"
        variant="outline" 
        className="w-full justify-between" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: selectedColor.color }}
          />
          <span>{selectedColor.label}</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg">
          <div className="py-1 max-h-60 overflow-auto">
            {colorOptions.map((color) => (
              <div
                key={color.value}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100",
                  value === color.value && "bg-gray-100"
                )}
                onClick={() => {
                  onChange(color.value)
                  setIsOpen(false)
                }}
              >
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: color.color }}
                />
                <span>{color.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}