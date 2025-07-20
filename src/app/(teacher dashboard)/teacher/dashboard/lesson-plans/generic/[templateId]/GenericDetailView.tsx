'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getLessonPlanByID, updateGenericLessonPlan, copyTemplateToLessonPlan } from '@/src/app/actions/lessonPlansActions';
import { getFiles, deleteFile, updateFile } from '@/src/app/actions/fileActions';
import { deleteAssignment } from '@/src/app/actions/assignmentActions';
import Breadcrumbs from '@/src/components/Breadcrumbs';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/src/components/ui/accordion';
import UploadFileDialog from '@/src/components/lessonPlans/UploadFileDialog';
import FileTable from '@/src/components/lessonPlans/FileTable';
import RichEditor from '@/src/components/RichEditor';
import { Pen, ChevronLeft, BookOpen, BookPlus } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { toast } from 'sonner';
import AssignToClassDialog from '@/src/components/lessonPlans/AssignToClassDialog';
import UploadAssignmentDialog from '@/src/components/lessonPlans/UploadAssignmentDialog';
import AssignmentTable from '@/src/components/lessonPlans/AssignmentTable';
import { TemplateCopyDialog } from '@/src/components/lessonPlans/TemplateCopyDialog';
import EditFileDialog from '@/src/components/lessonPlans/EditFileDialog';
import EditAssignmentDialog from '@/src/components/lessonPlans/EditAssignmentDialog';
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
import { Loader2 } from 'lucide-react';

interface GenericDetailViewProps {
  templateId: string;
}

export default function GenericDetailView({ templateId }: GenericDetailViewProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter(); // Add router
  const [template, setTemplate] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]); // Add assignments state
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', gradeLevel: 'all' });
  const [error, setError] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isAddToClassDialogOpen, setIsAddToClassDialogOpen] = useState(false);
  
  // Add these state variables at the top of the component
  const [copyDialogState, setCopyDialogState] = useState<{
    isOpen: boolean;
    actionType: 'edit' | 'delete' | 'visibility';
    itemType?: 'file' | 'assignment';
    itemName?: string;
    itemId?: string;
  } | null>(null);
  
  const [isCopying, setIsCopying] = useState(false);
  
  // Move these state declarations up here with the other states
  const [fileToEdit, setFileToEdit] = useState<any>(null);
  const [assignmentToEdit, setAssignmentToEdit] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
    // Add this state near your other state declarations
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false);

  const isSuperUser = session?.user?.role === 'SUPER';
  const canEdit = isSuperUser;
  const isTeacher = session?.user?.role === 'TEACHER';

  // Get back navigation URL
  const getBackUrl = () => {
    const grade = searchParams.get('grade');
    const gradeParam = grade && grade !== 'all' ? `&grade=${grade}` : '';
    return `/teacher/dashboard/lesson-plans?tab=templates${gradeParam}`;
  };

  const getBackLabel = () => {
    const grade = searchParams.get('grade');
    return grade && grade !== 'all' 
      ? `Back to Templates (Grades ${grade})`
      : 'Back to Templates';
  };

  // Function to fetch files from database
  const fetchFiles = async () => {
    if (!templateId) return;
    
    try {
      setIsLoadingFiles(true);
      const result = await getFiles(templateId, true); // true for generic
      if (result.success) {
        setFiles(result.files || []);
      } else {
        console.error('Failed to fetch files:', result.error);
        setFiles([]);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Function to fetch assignments
  const fetchAssignments = async () => {
    if (!templateId) return;

    // Set loading state
    setIsLoadingAssignments(true);
    
    try {
      // Use the server action directly to get assignments
      const response = await getLessonPlanByID(templateId);
      
      if (response.success) {
        // Set assignments from the successful response
        if (response.data && response.data.assignments) {
          setAssignments(response.data.assignments);
        } else {
          setAssignments([]);
        }
        setError(null);
      } else {
        console.error("Failed to fetch assignments:", response.error);
        setError('Failed to load assignments');
        setAssignments([]);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setError('Failed to load assignments');
      setAssignments([]);
    } finally {
      // Always turn off loading state when done
      setIsLoadingAssignments(false);
    }
  };

  // Fetch template on mount
  useEffect(() => {
    async function fetchTemplate() {
      setLoading(true);
      try {
        const res = await getLessonPlanByID(templateId);
        if (res.success) {
          setTemplate(res.data);
          if (res.data) {
            setForm({
              name: res.data.name,
              description: res.data.description || '',
              gradeLevel: res.data.gradeLevel || 'all',
            });
            
            if (res.data.assignments) {
              setAssignments(res.data.assignments);
            }
          }
          setError(null);
        } else {
          setError(res.error || 'Failed to fetch template');
        }
      } catch (error: any) {
        setError(error.message || 'An unexpected error occurred');
        console.error('Error fetching template:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  // Refresh data when accordion sections are opened
  useEffect(() => {
    if (!accordionValue) return;
    
    if (accordionValue === 'files') {
      fetchFiles();
    } else if (accordionValue === 'assignments') {
      fetchAssignments();
    }
  }, [accordionValue]);

  // Save handler: update via action function and update state
  async function handleSave() {
    if (!canEdit) {
      setError('You do not have permission to edit this template');
      return;
    }
    
    try {
      // Update the template (only super users can do this)
      const res = await updateGenericLessonPlan(templateId, {
        name: form.name,
        description: form.description,
        gradeLevel: form.gradeLevel,
      });
      
      if (res.success) {
        // Update template state but preserve assignments
        setTemplate({
          ...res.data,
          assignments: template.assignments || []
        });
        setEditMode(false);
        setError(null);
        toast.success('Template updated successfully');
      } else {
        setError(res.error || 'Failed to update template');
        toast.error(res.error || 'Failed to update template');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update template');
      toast.error('An error occurred while updating the template');
    }
  }

  // Cancel editing: reset form to last saved values
  function handleCancel() {
    if (template) {
      setForm({
        name: template.name,
        description: template.description || '',
        gradeLevel: template.gradeLevel || 'all',
      });
    }
    setEditMode(false);
  }

  // Handle successful file upload
  const handleFileUploaded = (uploadedFile: any) => {
    // Refresh files from database after upload
    fetchFiles();
  };

  // Format created date
  const formattedDate = template?.createdAt 
    ? new Date(template.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  // Reusable function to copy template to teacher's lesson plans
  const copyTemplateForTeacher = async (
    actionType: 'edit' | 'delete' | 'visibility',
    itemType?: 'file' | 'assignment',
    itemName?: string,
    itemId?: string
  ) => {
    if (!isTeacher) return;
    
    setCopyDialogState({
      isOpen: true,
      actionType,
      itemType,
      itemName,
      itemId
    });
  };

  // Add this new function to handle the copy confirmation
  const handleCopyConfirm = async () => {
    if (!copyDialogState) return;
    
    setIsCopying(true);
    try {
      const copyResponse = await copyTemplateToLessonPlan(templateId, {
        name: template.name,
        actionType: copyDialogState.actionType,
        itemType: copyDialogState.itemType,
        itemId: copyDialogState.itemId,
        itemName: copyDialogState.itemName,
      });
      
      if (!copyResponse.success) {
        throw new Error(copyResponse.error || "Failed to copy template");
      }

      // Build URL parameters based on the action type and target
      const params = new URLSearchParams({
        from: 'template',
        action: copyDialogState.actionType,
      });

      // Add item-specific parameters only when dealing with files or assignments
      if (copyDialogState.itemType && copyDialogState.itemId) {
        params.append('itemType', copyDialogState.itemType);
        params.append('itemId', copyDialogState.itemId);
        
        // For edit/delete actions, also include the section to open
        if (['edit', 'delete'].includes(copyDialogState.actionType)) {
          params.append('openTab', `${copyDialogState.itemType}s`);
        }
      }

      // Navigate to the new lesson plan with the appropriate parameters
      router.push(`/teacher/dashboard/lesson-plans/${copyResponse.data.id}?${params.toString()}`);
    } catch (error: any) {
      console.error("Error copying template:", error);
      toast.error(error.message || "Failed to copy template");
    } finally {
      setIsCopying(false);
      setCopyDialogState(null);
    }
  };

  // Update handleManageAssignmentVisibility
  const handleManageAssignmentVisibility = async (assignment: any) => {
    if (isSuperUser) {
      // Super user implementation
      console.log("Managing visibility for assignment:", assignment.id);
    } else if (isTeacher) {
      await copyTemplateForTeacher('visibility', 'assignment', assignment.name, assignment.id);
    }
  };

  // Update handleManageFileVisibility
  const handleManageFileVisibility = async (file: any) => {
    if (isSuperUser) {
      // Super user implementation
      console.log("Managing visibility for file:", file.id);
    } else if (isTeacher) {
      await copyTemplateForTeacher('visibility', 'file', file.name, file.id);
    }
  };

  // Add a handler for deleting items
  const handleDeleteItem = async (itemType: 'file' | 'assignment', itemId: string, itemName: string) => {
    if (isSuperUser) {
      // Super user delete implementation
      // This would call the appropriate delete action
    } else if (isTeacher) {
      await copyTemplateForTeacher('delete', itemType, itemName, itemId);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]">Loading...</div>;
  if (!template) return <div className="flex justify-center items-center min-h-[60vh]">Template not found</div>;

  // Function to handle when a teacher clicks the edit button
  function handleTeacherEdit(type?: 'file' | 'assignment', itemName?: string, itemId?: string) {
    if (!isTeacher) return;

    copyTemplateForTeacher('edit', type, itemName, itemId);
  }

  // Handler for super users to edit files
  const handleSuperUserEditFile = (fileId: string, fileName: string) => {
    if (!isSuperUser) return;
    
    const file = files.find(f => f.id === fileId);
    if (file) {
      setFileToEdit(file);
    }
  };

  // Handler for super users to delete files
  const handleSuperUserDeleteFile = async (fileId: string, fileName: string) => {
    if (!isSuperUser) return;
    
    if (!confirm(`Are you sure you want to delete the file "${fileName}"? This action cannot be undone.`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const result = await deleteFile(fileId);
      if (result.success) {
        toast.success("File deleted successfully");
        fetchFiles(); // Refresh the file list
      } else {
        toast.error(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error("An error occurred while deleting the file");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for super users to edit assignments
  const handleSuperUserEditAssignment = (assignmentId: string, assignmentName: string) => {
    if (!isSuperUser) return;
    
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setAssignmentToEdit({
        ...assignment,
        isGeneric: true
      });
    }
  };

  // Handler for super users to delete assignments
  const handleSuperUserDeleteAssignment = async (assignmentId: string, assignmentName: string) => {
    if (!isSuperUser) return;
    
    if (!confirm(`Are you sure you want to delete the assignment "${assignmentName}"? This action cannot be undone.`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const result = await deleteAssignment(assignmentId);
      if (result.success) {
        toast.success("Assignment deleted successfully");
        fetchAssignments(); // Refresh the assignments list
      } else {
        toast.error(result.error || "Failed to delete assignment");
      }
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      toast.error("An error occurred while deleting the assignment");
    } finally {
      setIsDeleting(false);
    }
  };



  // Replace the direct copy function with a two-step process
  const handleTeacherCopyButton = () => {
    if (!isTeacher) return;
    setShowCopyConfirmation(true);
  };

  // Update the copy handler to be used after confirmation
  const handleTeacherCopy = async () => {
    if (!isTeacher) return;
    
    setIsCopying(true);
    setShowCopyConfirmation(false);
    
    try {
      const copyResponse = await copyTemplateToLessonPlan(templateId, {
        name: template.name,
      });
      
      if (!copyResponse.success) {
        throw new Error(copyResponse.error || "Failed to copy template");
      }

      toast.success("Template copied successfully");
      
      // Navigate to the new lesson plan with the from=template parameter
      router.push(`/teacher/dashboard/lesson-plans/${copyResponse.data.id}?from=template`);
    } catch (error: any) {
      console.error("Error copying template:", error);
      toast.error(error.message || "Failed to copy template");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="w-full h-[100vh] lg:w-5/6 xl:w-3/4 mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Breadcrumbs - hidden on mobile */}
      <div className="hidden sm:block">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/teacher/dashboard' },
            { label: getBackLabel(), href: getBackUrl() },
            { label: template.name, href: '#' },
          ]}
        />
      </div>

      {/* Mobile Back Link */}
      <div className="sm:hidden mb-2">
        <Button variant="ghost" className="p-0 h-auto" asChild>
          <Link href={getBackUrl()}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {getBackLabel()}
          </Link>
        </Button>
      </div>

      {/* Template Badge and Grade Level */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-blue-700" />
          <Badge className="bg-blue-100 text-blue-700 border-blue-300">
            Template
          </Badge>
        </div>
        
        {template.gradeLevel && template.gradeLevel !== 'all' && (
          <Badge variant="outline" className="bg-gray-100">
            Grades {template.gradeLevel}
          </Badge>
        )}
        
        <div className="text-sm text-gray-500 ml-auto">
          Created: {formattedDate}
        </div>
      </div>

      {/* Header: Title, Edit, Save & Cancel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1">
          {editMode ? (
            <Input
              className="text-xl font-bold"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          ) : (
            <h1 className="text-2xl sm:text-3xl font-bold break-words">{template.name}</h1>
          )}
        </div>
        
        <div className="flex gap-2 self-end">
          {/* For Super Users: Edit/Save/Cancel */}
          {canEdit && (
            editMode ? (
              <>
                <Button onClick={handleSave} size="sm" className="bg-orange-500 hover:bg-orange-600">Save</Button>
                <Button variant="secondary" onClick={handleCancel} size="sm">
                  Cancel
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => setEditMode(true)} 
                size="sm" 
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Pen className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )
          )}
          
          {/* For Teachers: Only show the Edit button (remove duplicate, assign to class, etc.) */}
          {isTeacher && (
            <>
            <Button 
              onClick={() => handleTeacherEdit()} 
              size="sm" 
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Pen className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button 
              onClick={handleTeacherCopyButton}
              size="sm" 
              className="bg-blue-500 hover:bg-blue-600"
              disabled={isCopying}
            > 
              <BookPlus className="h-4 w-4 mr-2" />
              {isCopying ? "Copying..." : "Copy"}
            </Button>
            </>
          )}
        </div>
      </div>

      {/* Description Section */}
      <h2 className="text-lg sm:text-xl font-semibold">Description</h2>
      {editMode ? (
        <RichEditor
          content={form.description}
          onChange={(content) => setForm({ ...form, description: content })}
          editable={true}
        />
      ) : (
        <div 
          className="rich-text-content rounded-md max-w-full overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: template.description || '<p></p>' }} 
        />
      )}

      {/* Accordion for Files and Assignments */}
      <Accordion
        type="single"
        collapsible
        value={accordionValue || undefined}
        onValueChange={(val) => setAccordionValue(val)}
        className="space-y-3 sm:space-y-4"
      >
        {/* Files */}
        <AccordionItem value="files" className="border-none">
          <AccordionTrigger className="bg-orange-500 text-white px-3 sm:px-4 py-2 rounded flex justify-between items-center">
            <span className="font-semibold">Files</span>
          </AccordionTrigger>
          <AccordionContent className="mt-2 overflow-x-auto">
            {canEdit && (
              <div className="flex justify-end mb-2">
                <UploadFileDialog
                  lessonPlanId={template.id}
                  isGeneric={true}
                  onFileUploaded={handleFileUploaded}
                />
              </div>
            )}
            
            {/* File Table */}
            {isLoadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-gray-600">Loading files...</span>
              </div>
            ) : (
              <FileTable 
                files={files} 
                onUpdate={fetchFiles}
                canDelete={canEdit}
                isGeneric={true}
                onManageVisibility={!isSuperUser ? handleManageFileVisibility : undefined}
                onDelete={!isSuperUser && isTeacher ? 
                  (fileId, fileName) => copyTemplateForTeacher('delete', 'file', fileName, fileId) : 
                  isSuperUser ? handleSuperUserDeleteFile : undefined}
                onEdit={!isSuperUser && isTeacher ?
                  (fileId, fileName) => copyTemplateForTeacher('edit', 'file', fileName, fileId) :
                  isSuperUser ? handleSuperUserEditFile : undefined}
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Assignments - new section added */}
        <AccordionItem value="assignments" className="border-none">
          <AccordionTrigger className="bg-orange-500 text-white px-3 sm:px-4 py-2 rounded flex justify-between items-center">
            <span className="font-semibold">Assignments</span>
          </AccordionTrigger>
          <AccordionContent className="mt-2 overflow-x-auto">
            {canEdit && (
              <div className="flex justify-end mb-2">
                <UploadAssignmentDialog
                  lessonPlanId={template.id}
                  isGeneric={true}
                  onAssignmentUploaded={() => {
                    // Refresh assignments after a short delay
                    setTimeout(fetchAssignments, 300);
                  }}
                />
              </div>
            )}
            
            {/* Assignment Table with consistent loading indicator */}
            {isLoadingAssignments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-gray-600">Loading assignments...</span>
              </div>
            ) : (
              <AssignmentTable 
                assignments={assignments} 
                onUpdate={fetchAssignments}
                onManageVisibility={!isSuperUser ? handleManageAssignmentVisibility : undefined}
                isGeneric={true}
                onEdit={!isSuperUser && isTeacher ?
                  (assignmentId, assignmentName) => copyTemplateForTeacher('edit', 'assignment', assignmentName, assignmentId) :
                  isSuperUser ? handleSuperUserEditAssignment : undefined}
                onDelete={!isSuperUser && isTeacher ? 
                  (assignmentId, assignmentName) => copyTemplateForTeacher('delete','assignment', assignmentName, assignmentId) : 
                  isSuperUser ? handleSuperUserDeleteAssignment : undefined}
              />
            )}
            
            {(!isLoadingAssignments && assignments.length === 0) && (
              <div className="text-center py-4 text-gray-500">
                No assignments have been created yet.
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Add to Class Dialog */}
      <AssignToClassDialog
        isOpen={isAddToClassDialogOpen}
        onClose={() => setIsAddToClassDialogOpen(false)}
        templateId={templateId}
        onSuccess={() => {
          setIsAddToClassDialogOpen(false);
        }}
      />

      {/* Copy Template Dialog - new addition */}
      {copyDialogState && (
        <TemplateCopyDialog
          isOpen={copyDialogState.isOpen}
          onOpenChange={(open) => !open && setCopyDialogState(null)}
          onConfirm={handleCopyConfirm}
          actionType={copyDialogState.actionType}
          itemType={copyDialogState.itemType}
          itemName={copyDialogState.itemName}
          isLoading={isCopying}
        />
      )}

      {/* Add these dialogs right before the closing div tag */}
      {fileToEdit && isSuperUser && (
        <EditFileDialog
          file={fileToEdit}
          open={!!fileToEdit}
          onClose={() => setFileToEdit(null)}
          onFileSaved={(updatedFile) => {
            fetchFiles();
            setFileToEdit(null);
          }}
          onUpdate={fetchFiles}
        />
      )}

      {assignmentToEdit && isSuperUser && (
        <EditAssignmentDialog
          assignment={assignmentToEdit}
          isOpen={!!assignmentToEdit}
          onClose={() => setAssignmentToEdit(null)}
          onUpdate={() => {
            fetchAssignments();
            setAssignmentToEdit(null);
          }}
          isGeneric={true}
        />
      )}

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {/* Copy Confirmation Dialog for Teachers */}
      <AlertDialog open={showCopyConfirmation} onOpenChange={setShowCopyConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy Template</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a personal copy of &quot;{template?.name}&quot; in your lesson plans.
              You'll be able to modify the copy without affecting the original template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCopying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTeacherCopy}
              disabled={isCopying}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isCopying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Copying...
                </>
              ) : (
                'Create Copy'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}