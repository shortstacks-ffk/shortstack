'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/src/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/src/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, BookOpen } from 'lucide-react';
import { deleteLessonPlan, removePlanFromClass } from '@/src/app/actions/lessonPlansActions';
import { toast } from 'sonner';
import EditLessonPlanDialog from './EditLessonPlanDialog';
import { Badge } from '@/src/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/src/components/ui/alert-dialog';
import { Button } from '@/src/components/ui/button';
import AssignLessonPlanDialog from './AssignLessonPlanDialog';

interface LessonPlanCardProps {
  plan: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    gradeLevel?: string;
    class?: {
      code?: string;
      name?: string;
      emoji?: string;
      grade?: string;
    };
    classes?: Array<{
      code: string;
      name: string;
      emoji?: string;
      grade?: string;
    }>;
  };
  backgroundColor?: string;
  classCode?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: () => void;
  viewContext?: 'class' | 'dashboard';
  isTemplate?: boolean;
}

export default function LessonPlanCard({ 
  plan, 
  backgroundColor = 'bg-blue-50',
  classCode,
  onEdit,
  onDelete,
  onUpdate,
  viewContext = 'dashboard',
  isTemplate = false,
}: LessonPlanCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // Determine the link URL based on context
  const getLinkUrl = () => {
    // Add navigation params to preserve the current context
    const searchParams = new URLSearchParams();
    
    if (viewContext === 'class' && classCode) {
      return `/teacher/dashboard/classes/${classCode}/lesson-plans/${plan.id}`;
    }
    
    // Add from parameter to know which tab user came from
    if (isTemplate) {
      searchParams.set('from', 'templates');
      if (plan.gradeLevel && plan.gradeLevel !== 'all') {
        searchParams.set('grade', plan.gradeLevel);
      }
    } else {
      searchParams.set('from', 'my-plans');
    }
    
    return `/teacher/dashboard/lesson-plans/${plan.id}?${searchParams.toString()}`;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on dropdown menu or its contents
    const target = e.target as HTMLElement;
    if (
      target.closest('.dropdown-menu') || 
      target.closest('[role="menu"]') ||
      target.closest('button')
    ) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  const handleDelete = async () => {
    // If parent component provided onDelete, use that instead
    if (onDelete) {
      onDelete();
      return;
    }
    
    // Otherwise use built-in delete functionality
    toast.promise(
      async () => {
        setIsDeleting(true);
        try {
          const response = await deleteLessonPlan(plan.id);
          
          if (!response.success) {
            throw new Error(response.error || 'Failed to delete lesson plan');
          }
          
          // Trigger refresh in parent component
          if (onUpdate) onUpdate();
          
          // Also manually refresh the router
          router.refresh();
          
          return response;
        } finally {
          setIsDeleting(false);
        }
      },
      {
        loading: 'Deleting lesson plan...',
        success: 'Lesson plan deleted successfully',
        error: (err) => `${err.message || 'Failed to delete'}`
      }
    );
  };

  const handleRemoveFromClass = async () => {
    if (!classCode) return;
    
    setIsRemoveDialogOpen(false);
    
    toast.promise(
      async () => {
        try {
          const response = await removePlanFromClass({
            lessonPlanId: plan.id,
            classCode
          });
          
          if (!response.success) {
            throw new Error(response.error || 'Failed to remove lesson plan from class');
          }
          
          // Trigger refresh in parent component
          if (onUpdate) onUpdate();
          
          return response;
        } catch (error) {
          console.error('Error removing lesson plan from class:', error);
          throw error;
        }
      },
      {
        loading: 'Removing lesson plan from class...',
        success: 'Lesson plan removed from class successfully',
        error: (err) => `${err.message || 'Failed to remove lesson plan from class'}`
      }
    );
  };

  const handleEdit = () => {
    // If parent component provided onEdit, use that instead
    if (onEdit) {
      onEdit();
      return;
    }
    
    // Otherwise use built-in edit functionality
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    // Trigger update in parent component
    if (onUpdate) onUpdate();
    // Also manually refresh the router
    router.refresh();
  };

  const formattedDate = new Date(plan.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <>
      <Card className={`w-[250px] h-[250px] rounded-xl overflow-hidden hover:shadow-md transition-shadow ${backgroundColor} cursor-pointer relative`}>
        <div className="absolute right-2 top-2 z-10" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-200">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dropdown-menu">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              
              {viewContext === 'class' ? (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setIsRemoveDialogOpen(true);
                }}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Remove from Class
                </DropdownMenuItem>
              ) : (
                !isTemplate && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    setIsAssignDialogOpen(true);
                  }}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Assign to Class
                  </DropdownMenuItem>
                )
              )}
              
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Link href={getLinkUrl()} onClick={handleCardClick}>
          <CardContent className="flex flex-col h-full p-4">
            {/* Content container with consistent margins */}
            <div className="flex flex-col h-full mt-6 mb-4">
              {/* Title - fixed height to prevent overflow */}
              <h1 className="text-lg font-bold text-black line-clamp-2 mb-2 min-h-[3.5rem]">
                {plan.name}
              </h1>
              
              {/* Description - reduced length and fixed height */}
              {plan.description && (
                <div className="mb-3 min-h-[2.5rem]">
                  <p className="text-sm text-black/70 line-clamp-2">
                    {plan.description.replace(/<[^>]*>/g, '').substring(0, 80)}
                    {plan.description.replace(/<[^>]*>/g, '').length > 80 ? '...' : ''}
                  </p>
                </div>
              )}
              
              {/* Grade level badge - fixed height */}
              <div className="mb-3 min-h-[1.5rem]">
                {plan.gradeLevel && plan.gradeLevel !== 'all' && (
                  <Badge variant="outline" className="text-xs bg-white/70">
                    Grades {plan.gradeLevel}
                  </Badge>
                )}
              </div>
              
              {/* Footer with class assignment status and date - push to bottom */}
              <div className="mt-auto space-y-2">
                {/* Class assignment status - simplified to show count only */}
                <div className="flex items-center justify-between">
                  {plan.classes && plan.classes.length > 0 ? (
                    <span className="inline-flex items-center text-xs bg-white rounded-full px-2 py-1 border">
                      {/* <span className="mr-1">📚</span> */}
                      <span>{plan.classes.length} class{plan.classes.length > 1 ? 'es' : ''} Assigned</span>
                    </span>
                  ) : (
                    viewContext === 'dashboard' && !isTemplate && (
                      <span className="inline-flex items-center text-xs bg-white rounded-full px-2 py-1 border text-gray-500">
                        {/* <span className="mr-1">📝</span> */}
                        <span>Unassigned</span>
                      </span>
                    )
                  )}
                  
                  {/* Created date on the same line */}
                  <span className="text-xs text-black/60">
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Link>
      </Card>

      {/* Edit Dialog */}
      <EditLessonPlanDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={handleEditSuccess}
        lessonPlan={plan}
      />

      {/* Remove from class confirmation dialog */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Lesson Plan from Class</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{plan.name}&quot; from this class. The lesson plan will still be available in your
              lesson plans library. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleRemoveFromClass}>
                Remove from Class
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign to Class Dialog */}
      {!isTemplate && (
        <AssignLessonPlanDialog
          isOpen={isAssignDialogOpen}
          onClose={() => setIsAssignDialogOpen(false)}
          lessonPlanId={plan.id}
          lessonPlanName={plan.name}
          onSuccess={() => {
            if (onUpdate) onUpdate();
          }}
        />
      )}
    </>
  );
}