"use client"
import { useForm } from "react-hook-form"
import { Button } from "@/src/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/src/components/ui/form"
import { Input } from "@/src/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { updateClass } from "@/src/app/actions/classActions"
import { toast } from "react-toastify"
import { useRouter } from "next/navigation"

interface EditClassProps {
  classData: {
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
  onSuccess: () => void
}

export default function EditClass({ classData, onSuccess }: EditClassProps) {
  const router = useRouter()
  const form = useForm({
    defaultValues: classData
  })

  const handleSubmit = async (data: any) => {
    const { error } = await updateClass(classData.id, data)
    
    if (error) {
      toast.error(error)
    } else {
      toast.success("Class updated successfully")
      router.refresh()
      onSuccess()
    }
  }

  return (
    <div className="w-full max-w-2xl bg-white rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Edit Class</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Form fields same as AddClass but with default values */}
          <Button type="submit">Save Changes</Button>
        </form>
      </Form>
    </div>
  )
}