"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { createClass } from "@/src/app/actions/classActions"
import { toast } from "react-toastify"
import { EmojiPickerButton } from "@/src/components/ui/emoji-picker-button"
import ClassScheduleForm from "./ClassScheduleForm"
import { ColorDropdown } from "@/src/components/ui/color-dropdown"
import { formatDateForInput, safeDateParse } from "@/src/lib/date-utils"
import { getUserTimeZone } from "@/src/lib/time-utils"
import { Loader2 } from "lucide-react"

interface ClassScheduleItem {
  days: number[];
  startTime: string;
  endTime: string;
}

interface ClassResponse {
  success: boolean;
  error?: string;
  data?: any;
  code?: string;
  id?: string;
}

type AddClassProps = {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: (newClass?: any) => void;
};

const AddClass = ({ isOpen, onClose, onSuccess }: AddClassProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedEmoji, setSelectedEmoji] = useState("📚")
  const [selectedColor, setSelectedColor] = useState("primary") // Default to blue
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>([
    { days: [1], startTime: "09:00", endTime: "10:00" } // Default: Monday 9-10am
  ]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset the form when visibility changes
  useEffect(() => {
    if (isOpen) {
      // Reset form on open
      formRef.current?.reset();
    }
  }, [isOpen]);

  const clientAction = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      
      formData.set('emoji', selectedEmoji);
      formData.set('color', selectedColor);
      formData.set('schedules', JSON.stringify(schedules));
      formData.set('startDate', formatDateForInput(startDate));
      formData.set('endDate', formatDateForInput(endDate));
      formData.set('timeZone', getUserTimeZone()); // Add user's timezone
      
      const result: ClassResponse = await createClass(formData);

      if (!result.success) {
        toast.error(result.error || "Failed to create class");
      } else {
        // Reset all state
        formRef.current?.reset();
        setSelectedEmoji("📚");
        setSelectedColor("primary");
        setSchedules([{ days: [1], startTime: "09:00", endTime: "10:00" }]);
        setStartDate(new Date());
        const newEndDate = new Date();
        newEndDate.setMonth(newEndDate.getMonth() + 3);
        setEndDate(newEndDate);
        
        // Call onSuccess first - this will close the dialog immediately
        if (onSuccess) {
          onSuccess(result.data);
        } else {
          onClose?.();
        }
        
        // Show toast after a delay to prevent it from showing while dialog is still visible
        setTimeout(() => {
          toast.success(`Class created successfully! Class code: ${result.code || ''}`);
        }, 200); // Delay the toast slightly
      }
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleScheduleChange = (newSchedules: ClassScheduleItem[]) => {
    setSchedules(newSchedules);
  };

  return (
    <form
      ref={formRef}
      action={clientAction}
      className="
        space-y-3
        overflow-y-auto
        max-h-[80vh]
        min-w-[400px]
        max-w-4xl  
        mx-auto  
      "
    >
      <div className="grid grid-cols-3 gap-2 p-4">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-xs">Class Name</Label>
          <Input id="name" name="name" placeholder="Class Name" required className="h-8" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Class Emoji</Label>
          <input type="hidden" name="emoji" value={selectedEmoji} />
          <EmojiPickerButton 
            value={selectedEmoji}
            onChange={setSelectedEmoji}
            className="w-full text-xl h-8"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="grade" className="text-xs">Grade</Label>
          <Select name="grade" defaultValue="9th">
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"].map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-1 border-t pt-2">
        <input type="hidden" name="color" value={selectedColor} />
        <Label className="text-xs">Class Color</Label>
        <ColorDropdown 
          value={selectedColor}
          onChange={setSelectedColor}
        />
      </div>

      <div className="border-t pt-2">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-xs font-medium">Class Period</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="startDate" className="text-xs">Start Date</Label>
            <Input 
              id="startDate" 
              name="startDate" 
              type="date" 
              value={formatDateForInput(startDate)}
              onChange={(e) => {
                if (e.target.value) {
                  setStartDate(safeDateParse(e.target.value));
                }
              }}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endDate" className="text-xs">End Date</Label>
            <Input 
              id="endDate" 
              name="endDate" 
              type="date"
              value={formatDateForInput(endDate)}
              onChange={(e) => {
                if (e.target.value) {
                  setEndDate(safeDateParse(e.target.value));
                }
              }}
              className="h-8"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-2">
        <ClassScheduleForm 
          value={schedules}
          onChange={handleScheduleChange}
        />
      </div>

      <div className="pt-2 border-t flex justify-end space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => !isSubmitting && onClose?.()}
          size="sm"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          size="sm"
          disabled={isSubmitting}
          className="min-w-[100px]"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Creating...</span>
            </span>
          ) : "Create Class"}
        </Button>
      </div>
    </form>
  );
};

export default AddClass;