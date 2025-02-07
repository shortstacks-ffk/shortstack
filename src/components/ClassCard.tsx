'use client'

import { Card } from "@/src/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { deleteClass } from "@/src/app/actions/classActions"
import { useState } from "react"
import { EditClassForm } from "./EditClassForm"
import { getRandomColorClass } from "@/src/lib/colorUtils"

interface ClassCardProps {
  id: string
  emoji: string
  name: string
  code: string
  colorClass: string
  cadence?: string
  day?: string
  time?: string
  grade?: string
  numberOfStudents?: number
}

export const ClassCard = ({ id, emoji, name, code, colorClass, ...props }: ClassCardProps) => {
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const cardColor = getRandomColorClass(id);
  
  // console.log('Card color:', cardColor);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this class?')) {
      await deleteClass(id)
    }
  }

  return (
    <Card className= {`w-[250px] h-[250px] rounded-xl flex flex-col justify-center items-center relative`}>
      <div className={`w-full h-full rounded-xl flex flex-col justify-center items-center `}>
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <MoreHorizontal className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setIsUpdateDialogOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Update
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-4xl mb-4">{emoji}</div>
        <h3 className="text-xl font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground mt-1">Code: {code}</p>
        {props.numberOfStudents && (
          <p className="text-sm text-muted-foreground mt-1">
            Capacity: {props.numberOfStudents} students
          </p>
        )}
      </div>

      <EditClassForm
        isOpen={isUpdateDialogOpen}
        onClose={() => setIsUpdateDialogOpen(false)}
        classData={{
          id,
          name,
          emoji,
          ...props
        }}
      />
    </Card>
  )
}