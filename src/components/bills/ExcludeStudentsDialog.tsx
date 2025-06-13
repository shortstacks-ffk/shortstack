"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Label } from "@/src/components/ui/label";
import { Checkbox } from "@/src/components/ui/checkbox";
import { excludeStudentsFromBill } from "@/src/app/actions/billActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";

interface StudentData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  className?: string;
  isPaid?: boolean;
}

interface ExcludeStudentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  billId: string;
  billTitle: string;
  students: StudentData[];
}

export default function ExcludeStudentsDialog({
  isOpen,
  onClose,
  billId,
  billTitle,
  students
}: ExcludeStudentsDialogProps) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleExcludeStudents = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await excludeStudentsFromBill({
        billId,
        studentIds: selectedStudentIds
      });
      
      if (result.success) {
        toast.success(result.message || "Students excluded from bill successfully");
        router.refresh();
        onClose();
      } else {
        toast.error(result.error || "Failed to exclude students");
      }
    } catch (error) {
      console.error("Error excluding students:", error);
      toast.error("Failed to exclude students");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out students who have already paid - they can't be excluded
  const availableStudents = students.filter(student => !student.isPaid);
  const hasAvailableStudents = availableStudents.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={open => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exclude Students from Bill</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {!hasAvailableStudents ? (
            <div className="flex items-center text-amber-600 p-3 bg-amber-50 rounded-md">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <p>All students have already paid this bill and cannot be excluded</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Select students to exclude from "{billTitle}":
              </p>
              
              <div className="max-h-60 overflow-y-auto border rounded p-2">
                {availableStudents.map(student => (
                  <div
                    key={student.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer mb-1 ${
                      selectedStudentIds.includes(student.id) ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <Checkbox
                      id={`student-${student.id}`}
                      checked={selectedStudentIds.includes(student.id)}
                      onCheckedChange={() => handleToggleStudent(student.id)}
                    />
                    <Label
                      htmlFor={`student-${student.id}`}
                      className="flex items-center cursor-pointer flex-1"
                      onClick={() => handleToggleStudent(student.id)}
                    >
                      <span>{student.firstName} {student.lastName}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {student.className || "No class"}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                <span>Students who have already paid cannot be excluded</span>
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExcludeStudents}
              disabled={isSubmitting || selectedStudentIds.length === 0 || !hasAvailableStudents}
              variant="default"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluding...
                </>
              ) : (
                "Exclude Selected"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}