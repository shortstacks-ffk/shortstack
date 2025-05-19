"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Label } from "@/src/components/ui/label";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Plus, Trash } from "lucide-react";
import { TimePicker } from "@/src/components/ui/time-picker";
import { format } from "date-fns";

interface ClassScheduleFormProps {
  value: ClassScheduleItem[];
  onChange: (schedules: ClassScheduleItem[]) => void;
}

interface ClassScheduleItem {
  days: number[];
  startTime: string;
  endTime: string;
}

const DAYS = [
  { name: "Sun", value: 0 },
  { name: "Mon", value: 1 },
  { name: "Tue", value: 2 },
  { name: "Wed", value: 3 },
  { name: "Thu", value: 4 },
  { name: "Fri", value: 5 },
  { name: "Sat", value: 6 },
];

export default function ClassScheduleForm({ value, onChange }: ClassScheduleFormProps) {
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>(value || []);


  const addScheduleItem = () => {
    const newSchedules = [
      ...schedules,
      { days: [], startTime: "09:00", endTime: "10:00" }
    ];
    setSchedules(newSchedules);
    onChange(newSchedules);
  };

  const removeScheduleItem = (index: number) => {
    const newSchedules = schedules.filter((_, i) => i !== index);
    setSchedules(newSchedules);
    onChange(newSchedules);
  };

  const updateScheduleItem = (index: number, field: keyof ClassScheduleItem, value: any) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
    onChange(newSchedules);
  };

  const toggleDay = (scheduleIndex: number, dayValue: number) => {
    const newSchedules = [...schedules];
    const currentDays = newSchedules[scheduleIndex].days;
    
    if (currentDays.includes(dayValue)) {
      newSchedules[scheduleIndex].days = currentDays.filter(d => d !== dayValue);
    } else {
      newSchedules[scheduleIndex].days = [...currentDays, dayValue].sort();
    }
    
    setSchedules(newSchedules);
    onChange(newSchedules);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Class Schedule</h3>
        <Button size="sm" onClick={addScheduleItem} type="button">
          <Plus className="mr-2 h-4 w-4" />
          Add Time Slot
        </Button>
      </div>
      
      {schedules.length === 0 && (
        <div className="text-center p-4 text-sm text-muted-foreground">
          No schedule items. Click the button above to add class times.
        </div>
      )}
      
      {schedules.map((schedule, index) => (
        <Card key={index} className="h-auto">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">
                Time Slot {index + 1}
              </CardTitle>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => removeScheduleItem(index)}
                type="button"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`startTime-${index}`}>Start Time</Label>
              <TimePicker
                isEndTime={false}
                value={new Date(`2000-01-01T${schedule.startTime || '09:00'}:00`)}
                onChange={(date) => {
                  const timeString = format(date, 'HH:mm');
                  updateScheduleItem(index, 'startTime', timeString);
                }}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor={`endTime-${index}`}>End Time</Label>
              <TimePicker
                isEndTime={true}
                scheduleStartTime={schedule.startTime} // Pass the current schedule's start time
                value={new Date(`2000-01-01T${schedule.endTime || '10:00'}:00`)}
                onChange={(date) => {
                  const timeString = format(date, 'HH:mm');
                  updateScheduleItem(index, 'endTime', timeString);
                }}
                className="w-full"
              />
            </div>
          </div>
            
            <div>
              <Label className="mb-2 block">Days</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DAYS.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`day-${index}-${day.value}`}
                      checked={schedule.days.includes(day.value)}
                      onCheckedChange={() => toggleDay(index, day.value)}
                    />
                    <Label htmlFor={`day-${index}-${day.value}`}>{day.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}