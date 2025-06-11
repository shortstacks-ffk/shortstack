'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter } from '@/src/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/src/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, BookOpen, BookPlus } from 'lucide-react';
import { deleteGenericLessonPlan } from '@/src/app/actions/lessonPlansActions';
import { toast } from 'sonner';
import EditTemplateDialog from './EditTemplateDialog';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import AssignToClassDialog from './AssignToClassDialog';

interface TemplateLessonPlanCardProps {
  plan: {
    id: string;
    name: string;
    description?: string;
    gradeLevel?: string;
    createdAt: string;
    updatedAt: string;
  };
  backgroundColor?: string;
  isSuperUser: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: () => void;
}

export default function TemplateLessonPlanCard({
  plan,
  backgroundColor = 'bg-blue-50',
  isSuperUser,
  onEdit,
  onDelete,
  onUpdate,
}: TemplateLessonPlanCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on dropdown menu or its contents
    const target = e.target as HTMLElement;
    if (
      target.closest('.dropdown-menu') || 
      target.closest('[role="menu"]') ||
      target.closest('button')  // Don't navigate if clicking any button
    ) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  const handleDelete = async () => {
    // This is only for super users
    if (!isSuperUser) return;
    
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
          const response = await deleteGenericLessonPlan(plan.id);
            
          if (!response.success) {
            throw new Error(response.error || 'Failed to delete template');
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
        loading: 'Deleting template...',
        success: 'Template deleted successfully',
        error: (err) => `${err.message || 'Failed to delete template'}`
      }
    );
  };

  const handleEdit = () => {
    // This is only for super users
    if (!isSuperUser) return;
    
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

  // Format created date
  const formattedDate = new Date(plan.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const getLinkUrl = () => {
    const searchParams = new URLSearchParams();
    searchParams.set('from', 'templates');
    if (plan.gradeLevel && plan.gradeLevel !== 'all') {
      searchParams.set('grade', plan.gradeLevel);
    }
    
    
    return `/teacher/dashboard/lesson-plans/generic/${plan.id}?${searchParams}`;
  };

  return (
    <>
      <Link href={getLinkUrl()} onClick={handleCardClick}>
        <Card className={`w-[250px] h-[250px] overflow-hidden hover:shadow-md transition-shadow ${backgroundColor} border-t-4 border-t-blue-500 relative`}>
          <div className="absolute top-3 right-3">
            {/* Edit/Delete Menu Dropdown - only for super users */}
            {isSuperUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 rounded-full bg-white/80 hover:bg-white">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-menu">
                  <DropdownMenuItem onClick={handleEdit} disabled={isDeleting}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Template
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete Template'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 rounded-full bg-white/80 hover:bg-white"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAssignDialogOpen(true);
                }}
              >
                <BookPlus className="h-4 w-4 mr-1" />
                Assign
              </Button>
            )}
          </div>

          <div className="px-2 pt-2">
            <div className="flex items-center mb-2 mt-2">
              <BookOpen className="h-5 w-5 mr-2 text-blue-700" />
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                Template
              </Badge>
            </div>
          </div>

          <CardContent className="flex flex-col p-4 pt-0">
            <h1 className="text-xl font-bold text-blue-900 mb-3 line-clamp-2">{plan.name}</h1>
            
            {/* Show description excerpt */}
            {plan.description && (
              <p className="text-sm text-blue-800/70 line-clamp-2 mb-3">
                {plan.description.replace(/<[^>]*>/g, '').substring(0, 80)}
                {plan.description.length > 80 ? '...' : ''}
              </p>
            )}
            
            {/* Grade level and created date */}
            <div className="mt-auto flex flex-wrap gap-2 items-center justify-between">
              {plan.gradeLevel && plan.gradeLevel !== 'all' && (
                <Badge variant="outline" className="bg-white/70">
                  Grades {plan.gradeLevel}
                </Badge>
              )}
              <span className="text-xs text-blue-800/60">
                Created: {formattedDate}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Edit Dialog - only for super users */}
      {isSuperUser && (
        <EditTemplateDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSuccess={handleEditSuccess}
          template={plan}
        />
      )}
      
      {/* Assign to Class Dialog - only for regular teachers */}
      {!isSuperUser && (
        <AssignToClassDialog
          isOpen={isAssignDialogOpen}
          onClose={() => setIsAssignDialogOpen(false)}
          templateId={plan.id}
          onSuccess={() => {
            if (onUpdate) onUpdate();
          }}
        />
      )}
    </>
  );
}