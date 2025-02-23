"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Button } from "@/src/components/ui/button";

interface ClassFormData {
  name: string;
  studentCount: number;
  frequency: "daily" | "weekly";
  day:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  time: string; // time in hh:mm format
  grade: string; // grade like "1st", "2nd", etc.
}

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClassFormData) => void;
}


export function ClassFormModal({
  isOpen,
  onClose,
  onSubmit,
}: ClassFormModalProps) {
  const [formData, setFormData] = useState<ClassFormData>({
    name: "",
    studentCount: 0,
    frequency: "daily", // default value, or empty if optional
    day: "monday", // default value, or empty if optional
    time: "12:00", // default value, you can adjust it
    grade: "1st", // default value
  });

  const [disableValidation, setDisableValidation] = useState(false);

  // Function to reset the form
const resetForm = () => {
  setFormData({
    name: "",
    studentCount: 0,
    frequency: "daily", // default value, or empty if optional
    day: "monday", // default value, or empty if optional
    time: "12:00", // default value, you can adjust it
    grade: "1st", // default value
  });
};

const handleClose = () => {
  setDisableValidation(true); // Disable validation
  resetForm(); // Reset the form
  onClose(); // Close the modal
  setTimeout(() => setDisableValidation(false), 0); // Re-enable validation
};

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: "",
      studentCount: 0,
      frequency: "daily",
      day: "monday",
      time: "12:00",
      grade: "1st",
    }); // Reset form
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Class</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Class Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="frequency" className="text-right">
                Frequency
              </Label>
              <select
                id="frequency"
                value={formData.frequency}
                onChange={(e) =>
                  setFormData({ ...formData, frequency: e.target.value })
                }
                className="col-span-3 border border-gray-300 rounded-md p-2"
                required
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="day" className="text-right">
                Day
              </Label>
              <select
                id="day"
                value={formData.day}
                onChange={(e) =>
                  setFormData({ ...formData, day: e.target.value })
                }
                className="col-span-3 border border-gray-300 rounded-md p-2"
                required
              >
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time (hh:mm)
              </Label>
              <Input
                id="time"
                type="text"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className="col-span-3"
                placeholder="e.g., 09:00"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="grade" className="text-right">
                Grade
              </Label>
              <select
                id="grade"
                value={formData.grade}
                onChange={(e) =>
                  setFormData({ ...formData, grade: e.target.value })
                }
                className="col-span-3 border border-gray-300 rounded-md p-2"
                required
              >
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
                <option value="5th">5th</option>
                <option value="6th">6th</option>
                <option value="7th">7th</option>
                <option value="8th">8th</option>
                <option value="9th">9th</option>
                <option value="10th">10th</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="students" className="text-right">
                Students
              </Label>
              <Input
                id="students"
                type="number"
                value={formData.studentCount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    studentCount: Number(e.target.value),
                  })
                }
                className="col-span-3"
                min="0"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <div className="flex justify-between space-x-2">
            <Button
              className="bg-white text-limeGreen px-4 py-2 rounded border border-limeGreen"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              className="bg-limeGreen text-white px-4 py-2 rounded"
              type="submit"
            >
              Add Class
            </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
