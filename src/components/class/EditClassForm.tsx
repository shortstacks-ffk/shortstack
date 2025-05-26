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
  const [cadence, setCadence] = useState(classData.cadence || "Weekly")
  const [grade, setGrade] = useState(classData.grade || "9th")
  const [color, setColor] = useState(classData.color || "primary")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Initialize schedules from class sessions if available, or use default
  const defaultSchedule = [{ days: [1], startTime: "09:00", endTime: "10:00" }];
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>(
    classData.classSessions?.map(session => ({
      days: [session.dayOfWeek],
      startTime: session.startTime,
      endTime: session.endTime
    })) || defaultSchedule
  );

  const handleScheduleChange = (newSchedules: ClassScheduleItem[]) => {
    setSchedules(newSchedules);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await updateClass(classData.id, {
        name,
        emoji,
        cadence,
        grade,
        color,
        schedule: {
          days: schedules.flatMap(s => s.days),
          startTime: schedules[0]?.startTime || "09:00",
          endTime: schedules[0]?.endTime || "10:00"
        }
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
      <DialogContent className="max-w-4xl p-4">
        <DialogHeader className="mb-2">
          <DialogTitle>Edit Class</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Top section - Name, Emoji, Color */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label>Class Emoji</Label>
              <EmojiPickerButton 
                value={emoji}
                onChange={setEmoji}
                className="w-full text-2xl h-9"
              />
            </div>
            
            <div className="space-y-1">
              <Label>Class Color</Label>
              <ColorDropdown 
                value={color}
                onChange={setColor}
              />
            </div>
          </div>
          
          {/* Middle section - Cadence, Grade */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="cadence">Cadence</Label>
              <Select value={cadence} onValueChange={setCadence}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select cadence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Biweekly">Biweekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="grade">Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {["9th", "10th", "11th", "12th"].map((g) => (
                    <SelectItem key={g} value={g}>
                      {g} Grade
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule section */}
          <div className="space-y-1 pt-1">
            <Label>Class Schedule</Label>
            <ClassScheduleForm 
              value={schedules}
              onChange={handleScheduleChange}
            />
          </div>

          <DialogFooter className="mt-4 pt-2 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              size="sm"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}