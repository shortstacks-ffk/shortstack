'use client'
import { Dialog } from "@/src/components/ui/dialog"
import AddClass from "@/src/components/AddClass"
import EditClass from "@/src/components/EditClass"

interface ClassFormModalProps {
  isOpen: boolean
  onClose: () => void
  classData?: {
    id: string
    code: number
    name: string
    emoji: string
    cadence: string
    day: string
    time: string
    grade: string
    numberOfStudents: number
  }
}

export const ClassFormModal = ({ 
  isOpen, 
  onClose, 
  classData 
}: ClassFormModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
        {classData ? (
          <EditClass classData={classData} onSuccess={onClose} />
        ) : (
          <AddClass onSuccess={onClose} />
        )}
      </div>
    </Dialog>
  )
}