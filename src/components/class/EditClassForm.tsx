"use client"

import { useState } from "react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/src/components/ui/dialog"
import { updateClass } from "@/src/app/actions/classActions"
import { toast } from "react-toastify"
import { EmojiPickerButton } from "@/src/components/ui/emoji-picker-button"
import { ColorDropdown } from "@/src/components/ui/color-dropdown"
import ClassScheduleForm from "./ClassScheduleForm"

interface ClassScheduleItem {
  days: number[];
  startTime: string;
  endTime: string;
}

interface ClassData {
  id: string
  name: string
  emoji: string
  color?: string
  cadence?: string
  grade?: string
  classSessions?: any[]
}

interface EditClassFormProps {
  isOpen: boolean
  onClose: () => void
  classData: ClassData
}

export function EditClassForm({ isOpen, onClose, classData }: EditClassFormProps) {
  const [name, setName] = useState(classData.name)
  const [emoji, setEmoji] = useState(classData.emoji)
  const [grade, setGrade] = useState(classData.grade || "9th")
  const [color, setColor] = useState(classData.color || "primary")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Initialize schedules from class sessions if available, or use default
  const defaultSchedule = [{ days: [1], startTime: "09:00", endTime: "10:00" }];
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>(() => {
    if (!classData.classSessions || !Array.isArray(classData.classSessions) || classData.classSessions.length === 0) {
      return defaultSchedule;
    }
    
    // Group sessions by time slots
    const timeSlotMap: Record<string, ClassScheduleItem> = {};
    
    classData.classSessions.forEach(session => {
      // Make sure session has the required properties
      if (!session.startTime || !session.endTime || typeof session.dayOfWeek !== 'number') {
        console.warn('Invalid class session data:', session);
        return;
      }
      
      const timeKey = `${session.startTime}-${session.endTime}`;
      
      if (!timeSlotMap[timeKey]) {
        timeSlotMap[timeKey] = {
          days: [session.dayOfWeek],
          startTime: session.startTime,
          endTime: session.endTime
        };
      } else if (!timeSlotMap[timeKey].days.includes(session.dayOfWeek)) {
        timeSlotMap[timeKey].days.push(session.dayOfWeek);
      }
    });
    
    // Convert the map to an array
    const schedulesArray = Object.values(timeSlotMap);
    
    // Sort days within each schedule
    schedulesArray.forEach(s => {
      s.days = s.days.sort((a, b) => a - b);
    });
    
    return schedulesArray.length > 0 ? schedulesArray : defaultSchedule;
  });

  const handleScheduleChange = (newSchedules: ClassScheduleItem[]) => {
    setSchedules(newSchedules);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Check if all schedules have at least one day selected
      const hasInvalidSchedule = schedules.some(schedule => schedule.days.length === 0);
      if (hasInvalidSchedule) {
        toast.error("Please select at least one day for each time slot");
        setIsSubmitting(false);
        return;
      }

      const result = await updateClass(classData.id, {
        name,
        emoji,
        grade,
        color,
        // Send complete schedule data instead of just the first item
        schedules: schedules.map(schedule => ({
          days: schedule.days,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        }))
      });

      if (!result.success) {
        toast.error(result.error || "Failed to update class");
      } else {
        onClose();
        setTimeout(() => {
          toast.success("Class updated successfully");
        }, 100);
      }
    } catch (error) {
      console.error("Update class error:", error);
      toast.error("Failed to update class");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Only allow closing if we're not submitting
        if (!isSubmitting && !open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-4xl p-6 pt-10 overflow-hidden"> {/* Increased top padding and ensured overflow is handled */}
        <DialogHeader className="mb-2"> {/* Increased margin bottom */}
          <DialogTitle className="text-xl">Edit Class</DialogTitle> {/* Made title larger */}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto max-h-[75vh] pt-1"> {/* Added top padding */}
          {/* Top section - Name, Emoji, Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1"> {/* Added top padding */}
            <div className="space-y-2"> {/* Added top padding */}
              <Label htmlFor="name" className="text-sm font-medium block mb-1">Class Name</Label>
              {/* Custom input to avoid any potential styling issues */}
              <div className="relative">
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full h-9 px-4 py-3 text-base rounded-md border border-input bg-background"
                  placeholder="Enter class name"
                  style={{ 
                    lineHeight: '1.5', 
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div className="space-y-2"> {/* Increased spacing */}
              <Label className="text-sm font-medium">Class Emoji</Label>
              <EmojiPickerButton 
                value={emoji}
                onChange={setEmoji}
                className="w-full text-2xl h-9" /* Increased height */
              />
            </div>
            
            <div className="space-y-2"> {/* Increased spacing */}
              <Label className="text-sm font-medium">Class Color</Label>
              <ColorDropdown 
                value={color}
                onChange={setColor}
              />
            </div>

            <div className="space-y-2"> {/* Increased spacing */}
              <Label htmlFor="grade" className="text-sm font-medium">Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-9"> {/* Increased height */}
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule section */}
          <div className="space-y-2">
            <ClassScheduleForm 
              value={schedules}
              onChange={handleScheduleChange}
            />
          </div>

          <DialogFooter className="mt-4 pt-2 border-t"> {/* Increased margin top */}
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="h-9" /* Increased height */
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="h-9 bg-orange-500 hover:bg-orange-600 text-white" /* Increased height */
            >
              {isSubmitting ? "Updating..." : "Update Class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}