"use client"

import { useState } from "react"
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import addClass from "@/src/app/actions/addClass"
import { toast } from "react-toastify"
import { useRef } from 'react';
import { on } from "events"

type AddClassProps = {
    onSuccess?: () => void;
  };

const AddClass = ({ onSuccess }: AddClassProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedEmoji, setSelectedEmoji] = useState("📚")

  const clientAction = async (formData: FormData) => {
    const { data, error } = await addClass(formData);

    if (error) {
      toast.error(error);
    } else {
        toast.success("Class added successfully");
        formRef.current?.reset();
        onSuccess?.();
    }

  }

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setSelectedEmoji(emojiData.emoji)
  }

  return (
    <Card className="w-full h-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add Class</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={clientAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Class Code</Label>
              <Input id="code" name="code" placeholder="2612021" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfStudents">Number of Students</Label>
              <Input id="numberOfStudents" name="numberOfStudents" type="number" placeholder="Number of students" required />
              {/* <Select name="numberOfStudents" defaultValue="1">
                <SelectTrigger>
                  <SelectValue placeholder="Select number" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(30)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select> */}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Class Name</Label>
              <Input id="name" name="name" placeholder="Class Name" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cadence">Cadence</Label>
              <Select name="cadence" defaultValue="Daily">
                <SelectTrigger>
                  <SelectValue placeholder="Select cadence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Biweekly">Biweekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="day">Day</Label>
              <Select name="day" defaultValue="Thursday">
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" name="time" type="time" defaultValue="09:00" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select name="grade" defaultValue="10th Grade">
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {["9th Grade", "10th Grade", "11th Grade", "12th Grade"].map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Class Emoji</Label>
              <input type="hidden" name="emoji" value={selectedEmoji} />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full text-2xl h-10">
                    {selectedEmoji}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <EmojiPicker onEmojiClick={onEmojiClick} autoFocusSearch={false} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <Button variant="outline" type="button">
              Skip
            </Button>
            <Button type="submit">Save & Continue</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default AddClass

