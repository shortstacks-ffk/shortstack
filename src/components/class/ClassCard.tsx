'use client'
import React, { useState } from "react";
import { Card } from "@/src/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Users, Calendar, GraduationCap, Loader2 } from "lucide-react";
import { EditClassForm } from "./EditClassForm";
import { deleteClass, getClassByID } from "@/src/app/actions/classActions"
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";

// Define a more comprehensive ClassSession type
interface ClassSession {
  id?: string;
  classId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

// Define a more comprehensive ClassData type
interface ClassData {
  id: string;
  name: string;
  emoji: string;
  code: string;
  color: string;
  grade?: string;
  cadence?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  classSessions?: ClassSession[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClassCardProps {
  id: string;
  emoji: string;
  name: string;
  code: string;
  color?: string;
  grade?: string;
  numberOfStudents?: number;
  schedule?: string | null;
  overview?: string;
  onDelete?: (id: string) => void;
  onUpdate?: (updatedClass: any) => void; // Add this
}

export const ClassCard = ({ 
  id, 
  emoji, 
  name, 
  code, 
  color = "primary", 
  grade,
  numberOfStudents,
  schedule,
  overview,
  onDelete,
  onUpdate // Add this
}: ClassCardProps) => {
  const router = useRouter();
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Get background color directly using a simple mapping function
  const getBackgroundColor = () => {
    switch(color) {
      case "primary": return "bg-blue-500";
      case "secondary": return "bg-purple-500";
      case "destructive": return "bg-red-500";
      case "success": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "default": return "bg-gray-400";
      default: return "bg-blue-500";
    }
  };

  // Get text color directly - most are white except yellow and gray
  const getTextColor = () => {
    return color === "warning" || color === "default" ? "text-gray-900" : "text-white";
  };

  const bgClass = getBackgroundColor();
  const textClass = getTextColor();
  
  // Fetch class data including sessions when opening the edit dialog
  const handleOpenEditDialog = async () => {
    try {
      setIsLoading(true);
      const result = await getClassByID(id);
      
      if (result.success && result.data) {
        setClassData(result.data as ClassData);
        setIsUpdateDialogOpen(true);
      } else {
        toast.error("Failed to load class data");
      }
    } catch (error) {
      console.error("Error fetching class data:", error);
      toast.error("Failed to load class data");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCardClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.dropdown-menu') ||
      (e.target as HTMLElement).closest('[role="dialog"]')
    ) {
      e.stopPropagation();
      return;
    }
    router.push(`/teacher/dashboard/classes/${code}`);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteClass(id);
      
      if (result.success) {
        toast.success("Class deleted successfully");
        setIsDeleteDialogOpen(false);
        
        // Call the onDelete callback if provided
        if (onDelete) {
          onDelete(id);
        }
      } else {
        toast.error(result.error || "Failed to delete class");
      }
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Something went wrong while deleting the class");
    } finally {
      setIsDeleting(false);
    }
  };

  // Add this function to handle updates
  const handleClassUpdate = (updatedClass: any) => {
    if (onUpdate) {
      onUpdate(updatedClass);
    }
  };
  
  return (
    <>
      <Card className={`w-[250px] h-[250px] hover:shadow-md transition-shadow relative ${getBackgroundColor()} text-white cursor-pointer`}>
        <div
          onClick={handleCardClick} 
          className={`${bgClass} w-full h-full rounded-xl flex flex-col p-4 cursor-pointer`}
        >
          <div className="absolute top-2 right-2 dropdown-menu z-10" onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <MoreHorizontal className="h-5 w-5 text-white/70 hover:text-white" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleOpenEditDialog} disabled={isLoading}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {isLoading ? "Loading..." : "Update"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteClick}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col items-center mb-2">
            <div className="text-4xl mb-2">{emoji}</div>
            <h3 className={`text-xl font-semibold ${textClass} text-center`}>{name}</h3>
            <p className={`text-sm ${textClass} opacity-90 text-center`}>Code: {code}</p>
          </div>
          
          <div className="flex flex-col mt-auto space-y-1.5">
            {numberOfStudents !== undefined && (
              <div className={`flex items-center gap-2 ${textClass} opacity-80`}>
                <Users className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{numberOfStudents} students</p>
              </div>
            )}
            
            {schedule && (
              <div className={`flex items-center gap-2 ${textClass} opacity-80`}>
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <p className="text-xs line-clamp-2">{schedule}</p>
              </div>
            )}
            
            {grade && (
              <div className={`flex items-center gap-2 ${textClass} opacity-80`}>
                <GraduationCap className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">Grade: {grade}</p>
              </div>
            )}
          </div>
        </div>

        {isUpdateDialogOpen && classData && (
          <EditClassForm
            isOpen={isUpdateDialogOpen}
            onClose={() => setIsUpdateDialogOpen(false)}
            classData={classData}
            onUpdate={handleClassUpdate} // Add this prop
          />
        )}
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the class "{name}" and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }} 
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};