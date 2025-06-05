"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Label } from "@/src/components/ui/label";
import { Checkbox } from "@/src/components/ui/checkbox";
import { includeStudentsInBill } from "@/src/app/actions/billActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

interface StudentData {
  id: string;
  name: string;
  className?: string;
  classId?: string;
}

interface IncludeStudentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  billId: string;
  billTitle: string;
}

export default function IncludeStudentsDialog({
  isOpen,
  onClose,
  billId,
  billTitle
}: IncludeStudentsDialogProps) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch excluded students when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchExcludedStudents();
    }
  }, [isOpen, billId]);

  const fetchExcludedStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bills/${billId}/excluded-students`);
      if (response.ok) {
        const data = await response.json();
        setAvailableStudents(data);
      } else {
        toast.error("Failed to fetch excluded students");
      }
    } catch (error) {
      console.error("Error fetching excluded students:", error);
      toast.error("Failed to fetch excluded students");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleIncludeStudents = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await includeStudentsInBill({
        billId,
        studentIds: selectedStudentIds
      });
      
      if (result.success) {
        toast.success(result.message || "Students included in bill successfully");
        router.refresh();
        onClose();
        setSelectedStudentIds([]);
      } else {
        toast.error(result.error || "Failed to include students");
      }
    } catch (error) {
      console.error("Error including students:", error);
      toast.error("Failed to include students");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedStudentIds([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !isSubmitting && !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Include Students in Bill</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading excluded students...</span>
            </div>
          ) : availableStudents.length === 0 ? (
            <div className="flex items-center text-gray-600 p-3 bg-gray-50 rounded-md">
              <UserPlus className="h-5 w-5 mr-2" />
              <p>No excluded students found for this bill</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Select excluded students to include back in "{billTitle}":
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
                      <span>{student.name}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {student.className || "No class"}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleIncludeStudents}
              disabled={isSubmitting || selectedStudentIds.length === 0 || availableStudents.length === 0}
              variant="default"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Including...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Include Selected
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}