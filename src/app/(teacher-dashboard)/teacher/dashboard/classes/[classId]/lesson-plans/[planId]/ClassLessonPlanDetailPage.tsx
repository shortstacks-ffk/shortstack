'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLessonPlanByID, updateLessonPlan } from '@/src/app/actions/lessonPlansActions';
import { getFiles } from '@/src/app/actions/fileActions'; // Add this import
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
import UploadAssignmentDialog from '@/src/components/lessonPlans/UploadAssignmentDialog';
import AssignmentTable from '@/src/components/lessonPlans/AssignmentTable';
import RichEditor from '@/src/components/RichEditor';
import { Pen, ChevronLeft, Loader2 } from 'lucide-react';
import ContentVisibilityDialog from '@/src/components/lessonPlans/ContentVisibilityDialog';
import EditFileDialog from '@/src/components/lessonPlans/EditFileDialog';
import EditAssignmentDialog from '@/src/components/lessonPlans/EditAssignmentDialog';
import { deleteFile } from '@/src/app/actions/fileActions';
import { deleteAssignment } from '@/src/app/actions/assignmentActions';
import { toast } from 'sonner';
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

interface LessonPlanDetailProps {
  classId: string;
  planId: string;
}

export default function ClassLessonPlanDetailPage({ classId, planId }: LessonPlanDetailProps) {
  const [lessonPlan, setLessonPlan] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | null>('assignments');
  const [fileToManageVisibility, setFileToManageVisibility] = useState<any>(null);
  const [assignmentToManageVisibility, setAssignmentToManageVisibility] = useState<any>(null);
  
  // Add state for edit and delete functionality
  const [fileToEdit, setFileToEdit] = useState<any>(null);
  const [fileToDelete, setFileToDelete] = useState<any>(null);
  const [assignmentToEdit, setAssignmentToEdit] = useState<any>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false); // Add this state

  // Fetch lesson plan on mount.
  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await getLessonPlanByID(planId);
        if (res.success) {
          setLessonPlan(res.data);
          if (res.data) {
            setForm({
              name: res.data.name,
              description: res.data.description || '',
            });
          }
          setError(null);
        } else {
          setError(res.error || 'Failed to fetch lesson plan');
        }
      } catch (error: any) {
        setError(error.message || 'An unexpected error occurred');
        console.error('Error fetching lesson plan:', error);
      }
    }
    if (planId) {
      fetchPlan();
    }
  }, [planId]);

  // Save handler: update via action function and update state.
  async function handleSave() {
    try {
      // Make a copy of files and assignments before updating
      const currentFiles = lessonPlan.files || [];
      const currentAssignments = lessonPlan.assignments || [];
      
      const res = await updateLessonPlan(planId, {
        name: form.name,
        description: form.description,
      });
      
      if (res.success) {
        // Update lesson plan but preserve files and assignments
        setLessonPlan({
          ...res.data,
          files: currentFiles,
          assignments: currentAssignments
        });
        setEditMode(false);
        setError(null);
      } else {
        setError(res.error || null);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update lesson plan');
    }
  }

  // Cancel editing: reset form to last saved values.
  function handleCancel() {
    if (lessonPlan) {
      setForm({
        name: lessonPlan.name,
        description: lessonPlan.description || '',
      });
    }
    setEditMode(false);
  }
  
  // Add this function to fetch files with visibility data
  const fetchFiles = async () => {
    if (!planId) return;
    
    setIsLoadingFiles(true);
    try {
      // Use the getFiles server action for consistency with LessonPlanDetailView
      const result = await getFiles(planId, false);
      
      if (result.success) {
        // Update the files in the lesson plan state
        interface LessonPlanState {
          id: string;
          name: string;
          description: string;
          files?: FileItem[];
          assignments?: AssignmentItem[];
          class?: {
            id: string;
            name: string;
            code: string;
          };
        }
        
        interface FileItem {
                  id: string;
                  name: string;
                  url: string;
                  contentType: string;
                  classVisibility?: Array<{ classId: string; visibleToStudents: boolean }>;
                }
        
                interface AssignmentItem {
                  id: string;
                  name: string;
                  description?: string;
                  dueDate?: Date | string;
                  classVisibility?: Array<{ classId: string; visibleToStudents: boolean }>;
                }
                
                setLessonPlan((prev: LessonPlanState) => ({
          ...prev,
          files: result.files as FileItem[] || []
        }));
      } else {
        throw new Error(result.error || 'Failed to fetch files');
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to load files");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Update the fetchPlan function to match LessonPlanDetailView's approach
  async function fetchPlan() {
    try {
      console.log('Fetching lesson plan with ID:', planId);
      const res = await getLessonPlanByID(planId);
      console.log('getLessonPlanByID result:', res);
      
      if (res.success) {
        // Store the basic lesson plan data
        const planData = res.data;
        setLessonPlan(planData);
        
        if (res.data) {
          setForm({
            name: res.data.name,
            description: res.data.description || '',
          });
          
          // Fetch files and assignments with their visibility data
          setTimeout(() => {
            fetchFiles();
            fetchAssignments();
          }, 100);
        }
        setError(null);
      } else {
        setError(res.error || 'Failed to fetch lesson plan');
        toast.error(res.error || 'Failed to load lesson plan');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
      console.error('Error fetching lesson plan:', error);
      toast.error('Error loading lesson plan');
    }
  }

  // Update the fetchAssignments function to properly fetch visibility data
  const fetchAssignments = async () => {
    if (!planId) return;
    
    try {
      console.log('Fetching assignments for lessonPlan:', planId, 'and class ID:', classId);
      // Fetch assignments with visibility data for this specific class context
      // Make sure we're using the actual class ID parameter, not the code
      const response = await fetch(`/api/teacher/lesson-plans/${planId}/assignments?includeVisibility=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }
      
      const data = await response.json();
      console.log('Assignments with visibility data:', data);
      
      // Update the assignments in the lesson plan state
      // Define the type for assignments data
      interface Assignment {
        id: string;
        name: string;
        description?: string;
        dueDate?: Date | string;
        classVisibility?: Array<{ classId: string; visibleToStudents: boolean }>;
        // Add other assignment properties as needed
      }
      
      setLessonPlan((prev: { 
        id: string;
        name: string; 
        description: string;
        files?: any[];
        assignments?: Assignment[];
        class?: { 
          id: string;
          name: string;
          code: string;
        };
      }) => ({
        ...prev,
        assignments: data as Assignment[]
      }));
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load assignments");
    }
  };

  const handleManageFileVisibility = (file: any) => {
    console.log('Managing file visibility in class context:', classId);
    setFileToManageVisibility({
      ...file,
      // Important: Ensure we have the class info for the dialog
      lessonPlanClasses: [{ 
        id: classId, 
        name: lessonPlan?.class?.name || 'Current Class', 
        code: lessonPlan?.class?.code || '' 
      }]
    });
  };

  const handleManageAssignmentVisibility = (assignment: any) => {
    console.log('Managing assignment visibility in class context:', classId);
    console.log('Managing assignment visibility in class ID:', lessonPlan?.class?.id);
    setAssignmentToManageVisibility({
      ...assignment,
      // Important: Ensure we have the class info for the dialog
      lessonPlanClasses: [{ 
        id: classId, 
        name: lessonPlan?.class?.name || 'Current Class', 
        code: lessonPlan?.class?.code || '' 
      }]
    });
  };
  
  // Add handlers for edit and delete functionality
  const handleEditFile = (fileId: string, fileName: string) => {
    const file = lessonPlan.files.find((f: any) => f.id === fileId);
    if (file) {
      setFileToEdit(file);
    }
  };

  const handleDeleteFile = (fileId: string, fileName: string) => {
    setFileToDelete(fileId);
  };

  const handleEditAssignment = (assignmentId: string, assignmentName: string) => {
    const assignment = lessonPlan.assignments.find((a: any) => a.id === assignmentId);
    if (assignment) {
      // Check if assignment is visible in any class
      interface ClassVisibility {
        classId: string;
        visibleToStudents: boolean;
      }
      
      const isVisible: boolean = assignment.classVisibility && 
            (assignment.classVisibility as ClassVisibility[]).some(v => v.visibleToStudents);
      
      setAssignmentToEdit({
        ...assignment,
        isVisible: isVisible
      });
    }
  };

  const handleDeleteAssignment = (assignmentId: string, assignmentName: string) => {
    setAssignmentToDelete(assignmentId);
  };

  const handleFileDelete = async () => {
    if (!fileToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteFile(fileToDelete);
      if (result.success) {
        toast.success("File deleted successfully");
        await fetchPlan();
      } else {
        toast.error(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error("An error occurred while deleting the file");
    } finally {
      setIsDeleting(false);
      setFileToDelete(null);
    }
  };

  const handleAssignmentDelete = async () => {
    if (!assignmentToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteAssignment(assignmentToDelete);
      if (result.success) {
        toast.success("Assignment deleted successfully");
        await fetchPlan();
      } else {
        toast.error(result.error || "Failed to delete assignment");
      }
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      toast.error("An error occurred while deleting the assignment");
    } finally {
      setIsDeleting(false);
      setAssignmentToDelete(null);
    }
  };

  // Add an effect to fetch appropriate data when accordion changes
  useEffect(() => {
    if (!accordionValue) return;
    
    if (accordionValue === 'assignments') {
      fetchAssignments();
    } else if (accordionValue === 'files') {
      // Similarly implement fetchFiles if needed
      fetchPlan(); // This will refresh all data including files
    }
  }, [accordionValue]);

  // Add this function to verify that we have the correct class ID
  const checkClassInfo = async () => {
    try {
      // Try both the API endpoint and the class information from lessonPlan
      console.log('Checking class info for ID:', classId);
      
      // Get the class info from the lesson plan if available
      if (lessonPlan?.class?.id) {
        console.log('Class info from lesson plan:', {
          id: lessonPlan.class.id,
          name: lessonPlan.class.name,
          code: lessonPlan.class.code
        });
        
        // Now directly check visibility settings for a specific content ID
        if (lessonPlan?.assignments?.length > 0) {
          const assignmentId = lessonPlan.assignments[0].id;
          // Use the class ID from the lesson plan data instead of the URL parameter
          const visibilityResponse = await fetch(
            `/api/teacher/content-visibility?assignmentId=${assignmentId}&classIds=${lessonPlan.class.id}`
          );
          const visibilityData = await visibilityResponse.json();
          console.log('Direct visibility check for assignment:', visibilityData);
        }
        
        // No need to make an additional API call if we have the class info
        return;
      }
      
      // Only make an API call if we don't have the class info in the lesson plan
      const response = await fetch(`/api/teacher/classes/${classId}`);
      if (response.ok) {
        const classData = await response.json();
        console.log('Class details from API:', classData);
        
        // Now directly check visibility settings for a specific content ID
        if (lessonPlan?.assignments?.length > 0) {
          const assignmentId = lessonPlan.assignments[0].id;
          const actualClassId = classData.id;
          const visibilityResponse = await fetch(
            `/api/teacher/content-visibility?assignmentId=${assignmentId}&classIds=${actualClassId}`
          );
          const visibilityData = await visibilityResponse.json();
          console.log('Direct visibility check for assignment:', visibilityData);
        }
      } else {
        console.warn('Could not fetch class data:', classId);
        // Don't throw an error here, just log it
      }
    } catch (error) {
      console.error('Error checking class info:', error);
    }
  };

  // Call this function after successfully fetching the lesson plan
  useEffect(() => {
    if (lessonPlan && classId) {
      checkClassInfo();
    }
  }, [lessonPlan, classId]);

  if (!lessonPlan) return <div className="flex justify-center items-center min-h-[60vh]">Loading...</div>;

  return (
    <div className="w-full min-h-[100vh] lg:w-5/6 xl:w-3/4 mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Breadcrumbs - hidden on mobile */}
      <div className="hidden sm:block">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/teacher/dashboard' },
            { label: 'Back to Class', href: `/teacher/dashboard/classes/${classId}?tab=lessonPlans` },
            { label: lessonPlan.name, href: '#' },
          ]}
        />
      </div>

      {/* Mobile Back Link */}
      <div className="sm:hidden mb-2">
        <Button variant="ghost" className="p-0 h-auto" asChild>
          <Link href={`/teacher/dashboard/classes/${classId}?tab=lessonPlans`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Class
          </Link>
        </Button>
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
            <h1 className="text-2xl sm:text-3xl font-bold break-words">{lessonPlan.name}</h1>
          )}
        </div>
        
        {editMode ? (
          <div className="flex items-center gap-2 self-end">
            <Button onClick={handleSave} size="sm" className="bg-orange-500 hover:bg-orange-600">Save</Button>
            <Button variant="secondary" onClick={handleCancel} size="sm">
              Cancel
            </Button>
          </div>
        ) : (
          <Button 
            onClick={() => setEditMode(true)} 
            size="sm" 
            className="bg-orange-500 hover:bg-orange-600 self-end"
          >
            <Pen className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
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
          dangerouslySetInnerHTML={{ __html: lessonPlan.description || '<p></p>' }} 
        />
      )}

      {/* Accordion for Files & Assignments */}
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
            <div className="flex justify-end mb-2">
              <UploadFileDialog
                lessonPlanId={lessonPlan.id}
                onFileUploaded={(newFile) => {
                  // Open the files accordion
                  setAccordionValue('files');
                  // Refresh files from database after upload
                  setTimeout(() => fetchFiles(), 500);
                }}
              />
            </div>
            {/* File Table with loading state */}
            {isLoadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-gray-600">Loading files...</span>
              </div>
            ) : (
              <FileTable 
                files={lessonPlan.files || []} 
                onUpdate={fetchFiles}
                onManageVisibility={handleManageFileVisibility}
                onEdit={handleEditFile}
                onDelete={handleDeleteFile}
              />
            )}
            
            {(!lessonPlan.files || lessonPlan.files.length === 0) && !isLoadingFiles && (
              <div className="text-center py-4 text-gray-500">
                No files have been uploaded yet.
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Assignments */}
        <AccordionItem value="assignments" className="border-none">
          <AccordionTrigger className="bg-orange-500 text-white px-3 sm:px-4 py-2 rounded flex justify-between items-center">
            <span className="font-semibold">Assignments</span>
          </AccordionTrigger>
          <AccordionContent className="mt-2 overflow-x-auto">
            <div className="flex justify-end mb-2">
              <UploadAssignmentDialog
                lessonPlanId={lessonPlan.id}
                classId={classId}
                onAssignmentUploaded={(newAssignment) =>
                  setLessonPlan((prev: any) => ({
                    ...prev,
                    assignments: [...(prev.assignments || []), newAssignment],
                  }))
                }
              />
            </div>
            <AssignmentTable 
              assignments={lessonPlan.assignments || []} 
              onUpdate={async () => {
                await fetchPlan();
              }} 
              onManageVisibility={handleManageAssignmentVisibility}
              onEdit={handleEditAssignment}
              onDelete={handleDeleteAssignment}
            />
            
            {(!lessonPlan.assignments || lessonPlan.assignments.length === 0) && (
              <div className="text-center py-4 text-gray-500">
                No assignments have been created yet.
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {/* File Visibility Dialog */}
      {fileToManageVisibility && (
        <ContentVisibilityDialog
          isOpen={!!fileToManageVisibility}
          onClose={() => setFileToManageVisibility(null)}
          contentType="file"
          contentId={fileToManageVisibility.id}
          contentName={fileToManageVisibility.name}
          lessonPlanId={lessonPlan.id}
          classes={[{ 
            id: classId, 
            name: lessonPlan?.class?.name || 'Current Class', 
            code: lessonPlan?.class?.code || ''
          }]}
          onSuccess={() => {
            fetchFiles();
            setFileToManageVisibility(null);
          }}
        />
      )}

      {/* Assignment Visibility Dialog */}
      {assignmentToManageVisibility && (
        <ContentVisibilityDialog
          isOpen={!!assignmentToManageVisibility}
          onClose={() => setAssignmentToManageVisibility(null)}
          contentType="assignment"
          contentId={assignmentToManageVisibility.id}
          contentName={assignmentToManageVisibility.name}
          lessonPlanId={lessonPlan.id}
          classes={[{ 
            id: classId, 
            name: lessonPlan?.class?.name || 'Current Class', 
            code: lessonPlan?.class?.code || '' 
          }]}
          onSuccess={() => {
            fetchAssignments();
            setAssignmentToManageVisibility(null);
          }}
        />
      )}
      
      {/* File Edit Dialog */}
      {fileToEdit && (
        <EditFileDialog
          file={fileToEdit}
          open={!!fileToEdit}
          onClose={() => setFileToEdit(null)}
          onFileSaved={(updatedFile) => {
            fetchPlan();
            setFileToEdit(null);
          }}
          onUpdate={fetchPlan}
        />
      )}

      {/* Assignment Edit Dialog */}
      {assignmentToEdit && (
        <EditAssignmentDialog
          assignment={assignmentToEdit}
          isOpen={!!assignmentToEdit}
          onClose={() => setAssignmentToEdit(null)}
          onUpdate={() => {
            fetchPlan();
            setAssignmentToEdit(null);
          }}
          currentLessonPlanId={planId}
        />
      )}

      {/* File Delete Dialog */}
      {fileToDelete && (
        <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete File</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this file? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFileDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Assignment Delete Dialog */}
      {assignmentToDelete && (
        <AlertDialog open={!!assignmentToDelete} onOpenChange={(open) => !open && setAssignmentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this assignment? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAssignmentDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
