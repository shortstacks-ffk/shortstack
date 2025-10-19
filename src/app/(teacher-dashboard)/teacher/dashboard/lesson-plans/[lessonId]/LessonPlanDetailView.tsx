'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { getLessonPlanByID, updateLessonPlan, updateGenericLessonPlan } from '@/src/app/actions/lessonPlansActions';
import { getFiles } from '@/src/app/actions/fileActions';
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
import { Pen, ChevronLeft } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { toast } from 'sonner';
import ContentVisibilityDialog from '@/src/components/lessonPlans/ContentVisibilityDialog';
import { TemplateCopySuccessDialog } from '@/src/components/lessonPlans/TemplateCopySuccessDialog';
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
import { deleteFile } from '@/src/app/actions/fileActions';
import { deleteAssignment } from '@/src/app/actions/assignmentActions';
import { Loader2 } from 'lucide-react';

interface LessonPlan {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  assignments?: any[];
  genericLessonPlanId?: string;
  __typename?: string;
  gradeLevel?: string;
  classes?: any[];
  associatedClasses?: any[];
}

interface LessonPlanDetailViewProps {
  lessonId: string;
}

export default function LessonPlanDetailView({ lessonId }: LessonPlanDetailViewProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [lessonPlan, setLessonPlan] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [fileToManageVisibility, setFileToManageVisibility] = useState<any>(null);
  const [assignmentToManageVisibility, setAssignmentToManageVisibility] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  // Add these state variables at the top of the component
  const [successDialogState, setSuccessDialogState] = useState<{
    isOpen: boolean;
    actionType: 'edit' | 'delete' | 'visibility';
    itemType?: string;
    itemId?: string;
  } | null>(null);
  const [fileToEdit, setFileToEdit] = useState<any>(null);
  const [fileToDelete, setFileToDelete] = useState<any>(null);
  const [assignmentToEdit, setAssignmentToEdit] = useState<any>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate these after lessonPlan is loaded
  const isTemplate = lessonPlan && lessonPlan.__typename === 'GenericLessonPlan';
  const isSuperUser = session?.user?.role === 'SUPER';
  const canEdit = !isTemplate || (isTemplate && isSuperUser);

  // Get back navigation URL
  const getBackUrl = () => {
    const fromTab = searchParams.get('from');
    const grade = searchParams.get('grade');
    const classCode = searchParams.get('classCode');
    
    // If coming from a class context
    if (classCode) {
      return `/teacher/dashboard/classes/${classCode}?tab=lessonPlans`;
    }
    
    // If coming from templates tab
    if (fromTab === 'templates') {
      const gradeParam = grade ? `?tab=templates&grade=${grade}` : '?tab=templates';
      return `/teacher/dashboard/lesson-plans${gradeParam}`;
    }
    
    // Default to my plans tab
    return '/teacher/dashboard/lesson-plans?tab=my-plans';
  };

  const getBackLabel = () => {
    const fromTab = searchParams.get('from');
    const grade = searchParams.get('grade');
    const classCode = searchParams.get('classCode');
    
    if (classCode) {
      return 'Back to Class Lesson Plans';
    }
    
    if (fromTab === 'templates') {
      return grade && grade !== 'all' 
        ? `Back to Templates (Grades ${grade})`
        : 'Back to Templates';
    }
    
    return 'Back to My Lesson Plans';
  };

  // Update the fetchFiles and fetchAssignments functions to be more consistent

  // Function to fetch files from database
  const fetchFiles = async () => {
    if (!lessonId) return;
    
    // Set loading state
    setIsLoadingFiles(true);
    
    try {
      // Use the getFiles server action instead of a non-existent API route
      const result = await getFiles(lessonId, isTemplate || false);
      
      if (result.success) {
        setFiles(result.files || []);
      } else {
        throw new Error(result.error || 'Failed to fetch files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
      toast.error('Error loading files');
    } finally {
      // Always turn off loading state when done
      setIsLoadingFiles(false);
    }
  };

  // Function to fetch assignments
  const fetchAssignments = async () => {
    if (!lessonId) return;

    // Set loading state
    setIsLoadingAssignments(true);
    
    try {
      // Fetch assignments with visibility data
      const response = await fetch(`/api/teacher/lesson-plans/${lessonId}/assignments?includeVisibility=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }
      
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setError('Failed to load assignments');
      setAssignments([]);
    } finally {
      // Always turn off loading state when done
      setIsLoadingAssignments(false);
    }
  };

  // Fetch lesson plan on mount
  useEffect(() => {
    async function fetchPlan() {
      setLoading(true);
      try {
        console.log('Fetching lesson plan with ID:', lessonId);
        const res = await getLessonPlanByID(lessonId);
        console.log('getLessonPlanByID result:', res);
        
        if (res.success) {
          // Ensure we have classes information
          let planData = res.data;
          
          // If no classes property exists or it's empty, make an explicit API call to get them
          if (!planData.classes || planData.classes.length === 0) {
            console.log('No classes found in lesson plan - fetching now');
            try {
              const classesResponse = await fetch(`/api/teacher/lesson-plans/${lessonId}/classes`);
              if (classesResponse.ok) {
                const classesData = await classesResponse.json();
                console.log('Retrieved classes:', classesData);
                // Add classes to plan data
                planData = {
                  ...planData,
                  classes: classesData
                };
              } else {
                console.error('Failed to fetch classes for lesson plan');
                // Still create an empty classes array if API call fails
                planData = {
                  ...planData,
                  classes: []
                };
              }
            } catch (classError) {
              console.error('Error fetching classes:', classError);
              planData = {
                ...planData,
                classes: []
              };
            }
          }
          
          setLessonPlan(planData);
          if (res.data) {
            setForm({
              name: res.data.name,
              description: res.data.description || '',
            });
            
            // Check if this is a generic lesson plan by looking at the data structure
            const isGenericPlan = res.data.__typename === 'GenericLessonPlan';
            console.log('Plan data:', res.data);
            
            // Fetch both files and assignments for regular lesson plans
            setTimeout(() => {
              fetchFiles();
              fetchAssignments();
            }, 100);
          }
          setError(null);
          
          // Handle URL parameters for special actions
          const openTab = searchParams.get('openTab');
          if (openTab) {
            console.log('Setting accordion to:', openTab);
            setAccordionValue(openTab);
          }
        } else {
          setError(res.error || 'Failed to fetch lesson plan');
          toast.error(res.error || 'Failed to load lesson plan');
        }
      } catch (error: any) {
        setError(error.message || 'An unexpected error occurred');
        console.error('Error fetching lesson plan:', error);
        toast.error('Error loading lesson plan');
      } finally {
        setLoading(false);
      }
    }
    
    if (lessonId) {
      fetchPlan();
    }
  }, [lessonId, searchParams]);

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
    try {
      // Make a copy of assignments before updating
      const currentAssignments = lessonPlan.assignments || [];
      
      // Determine if we're updating a regular lesson plan or a template
      let res;
      if (isTemplate && isSuperUser) {
        res = await updateGenericLessonPlan(lessonId, {
          name: form.name,
          description: form.description,
        });
      } else {
        res = await updateLessonPlan(lessonId, {
          name: form.name,
          description: form.description,
        });
      }
      
      if (res.success) {
        // Update lesson plan but preserve assignments
        setLessonPlan({
          ...res.data,
          assignments: currentAssignments
        });
        setEditMode(false);
        setError(null);
        toast.success('Lesson plan updated successfully');
      } else {
        setError(res.error || null);
        toast.error(res.error || 'Failed to update lesson plan');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update lesson plan');
      toast.error('An error occurred while updating the lesson plan');
    }
  }

  // Cancel editing: reset form to last saved values
  function handleCancel() {
    if (lessonPlan) {
      setForm({
        name: lessonPlan.name,
        description: lessonPlan.description || '',
      });
    }
    setEditMode(false);
  }

  // Handle successful file upload
  const handleFileUploaded = (uploadedFile: any) => {
    console.log('File uploaded, refreshing files...');
    
    // Open the files accordion
    setAccordionValue('files');
    
    // First add the new file to the current files array for immediate feedback
    setFiles(prevFiles => [...prevFiles, uploadedFile]);
    
    // Then refresh files from database after upload
    setTimeout(() => fetchFiles(), 500);
  };

  // Fetch lesson plan on mount
  useEffect(() => {
    async function fetchPlan() {
      setLoading(true);
      try {
        console.log('Fetching lesson plan with ID:', lessonId);
        const res = await getLessonPlanByID(lessonId);
        console.log('getLessonPlanByID result:', res);
        
        if (res.success) {
          // Ensure we have classes information
          let planData = res.data;
          
          // If no classes property exists or it's empty, do NOT make a separate API call
          // Instead, get classes from existing data or create an empty array
          if (!planData.classes || planData.classes.length === 0) {
            // Check if we can get classes from existing data
            if (planData.associatedClasses) {
              planData = {
                ...planData,
                classes: planData.associatedClasses
              };
            } else {
              // Set an empty classes array if no class data is available
              planData = {
                ...planData,
                classes: []
              };
            }
          }
          
          setLessonPlan(planData);
          if (res.data) {
            setForm({
              name: res.data.name,
              description: res.data.description || '',
            });
            
            // Check if this is a generic lesson plan by looking at the data structure
            const isGenericPlan = res.data.__typename === 'GenericLessonPlan';
            console.log('Plan data:', res.data);
            
            // Fetch both files and assignments for regular lesson plans
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
      } finally {
        setLoading(false);
      }
    }
    
    if (lessonId) {
      fetchPlan();
    }
  }, [lessonId, searchParams]);

  // Refresh data when accordion sections are opened
  useEffect(() => {
    if (!accordionValue) return;
    
    if (accordionValue === 'files') {
      fetchFiles();
    } else if (accordionValue === 'assignments') {
      fetchAssignments();
    }
  }, [accordionValue]);


  // Format created date
  const formattedDate = lessonPlan?.createdAt 
    ? new Date(lessonPlan.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const handleManageFileVisibility = (file: any) => {
    // Add these debug logs
    console.log('LessonPlan classes:', lessonPlan?.classes);
    console.log('Classes count:', lessonPlan?.classes?.length || 0);
    
    // Add a more comprehensive check to ensure classes are present
    if (!lessonPlan?.classes || lessonPlan.classes.length === 0) {
      console.log('No classes found in lesson plan - fetching now');
      // If no classes, make an API call to get them
      fetch(`/api/teacher/lesson-plans/${lessonId}/classes`)
        .then(res => res.json())
        .then(classesData => {
          console.log('Retrieved classes:', classesData);
          // Update the lessonPlan state with the retrieved classes
            setLessonPlan((prev: LessonPlan | null): LessonPlan => ({
            ...prev as LessonPlan,
            classes: classesData
            }));
          // Now set the file to manage visibility with updated classes
          setFileToManageVisibility({
            ...file,
            lessonPlanClasses: classesData
          });
        })
        .catch(err => {
          console.error('Error fetching classes:', err);
          // Still set the file even if class fetch fails
          setFileToManageVisibility(file);
        });
    } else {
      setFileToManageVisibility(file);
    }
  };

  const handleManageAssignmentVisibility = (assignment: any) => {
    console.log('Managing assignment visibility with classes:', lessonPlan?.classes);
    console.log('Classes count:', lessonPlan?.classes?.length || 0);
    
    if (!lessonPlan?.classes || lessonPlan.classes.length === 0) {
      console.log('No classes found in lesson plan - fetching now');
      fetch(`/api/teacher/lesson-plans/${lessonId}/classes`)
        .then(res => res.json())
        .then(classesData => {
          console.log('Retrieved classes:', classesData);
          setLessonPlan((prev: LessonPlan | null): LessonPlan => ({
            ...prev as LessonPlan,
            classes: classesData
            }));
          setAssignmentToManageVisibility({
            ...assignment,
            lessonPlanClasses: classesData
          });
        })
        .catch(err => {
          console.error('Error fetching classes:', err);
          setAssignmentToManageVisibility(assignment);
        });
    } else {
      setAssignmentToManageVisibility(assignment);
    }
  };
  
  // Add this effect to handle URL parameters
  useEffect(() => {
    const action = searchParams.get('action') as 'edit' | 'delete' | 'visibility';
    const itemType = searchParams.get('itemType');
    const itemId = searchParams.get('itemId');
    const from = searchParams.get('from');

    if (from === 'template' && action) {
      setSuccessDialogState({
        isOpen: true,
        actionType: action,
        itemType: itemType || undefined,
        itemId: itemId || undefined
      });
    }
  }, [searchParams]);

  // Add this function to handle the success dialog continue action
  const handleSuccessContinue = () => {
    if (!successDialogState) return;
    
    // First ensure the correct accordion section is open
    if (successDialogState.itemType) {
      setAccordionValue(`${successDialogState.itemType}s`);
    }

    // Add a small delay to ensure the accordion is open and items are loaded
    setTimeout(() => {
      // Handle the specific action
      switch (successDialogState.actionType) {
        case 'edit':
          if (!successDialogState.itemType) {
            // If no itemType, this is a template-level edit
            setEditMode(true);
          } else {
            // For files and assignments, trigger their respective edit handlers
            if (successDialogState.itemType === 'file') {
              handleEditFile(successDialogState.itemId || '', '');
            } else if (successDialogState.itemType === 'assignment') {
              handleEditAssignment(successDialogState.itemId || '', '');
            }
          }
          break;

        case 'delete':
          if (successDialogState.itemType === 'file') {
            handleDeleteFile(successDialogState.itemId || '', '');
          } else if (successDialogState.itemType === 'assignment') {
            handleDeleteAssignment(successDialogState.itemId || '', '');
          }
          break;

        case 'visibility':
          if (successDialogState.itemType === 'file') {
            const file = files.find(f => f.id === successDialogState.itemId);
            if (file) handleManageFileVisibility(file);
          } else if (successDialogState.itemType === 'assignment') {
            const assignment = assignments.find(a => a.id === successDialogState.itemId);
            if (assignment) handleManageAssignmentVisibility(assignment);
          }
          break;
      }
    }, 100); // Small delay to ensure accordion opens and data loads
    
    setSuccessDialogState(null);
  };

  // Add these handler functions after the state declarations
  const handleEditFile = (fileId: string, fileName: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setFileToEdit(file);
    }
  };

  const handleDeleteFile = (fileId: string, fileName: string) => {
    setFileToDelete(fileId);
  };

  const handleEditAssignment = (assignmentId: string, assignmentName: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      // Check if assignment is visible in any class
      // Define interface for the visibility structure
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
        fetchFiles();
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
        fetchAssignments();
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

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]">Loading...</div>;
  if (!lessonPlan) return <div className="flex justify-center items-center min-h-[60vh]">Lesson plan not found</div>;

  return (
    <div className="w-full min-h-[100vh] md:w-5/6 mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Breadcrumbs - hidden on mobile */}
      <div className="hidden sm:block">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/teacher/dashboard' },
            { label: getBackLabel(), href: getBackUrl() },
            { label: lessonPlan.name, href: '#' },
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

      {/* Template Badge (if applicable) */}
      {isTemplate && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-blue-100 text-blue-700 border-blue-300">
            Template
          </Badge>
          <div className="text-sm text-gray-500 ml-auto">
            Created: {formattedDate}
          </div>
        </div>
      )}

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
        
        <div className="flex gap-2 self-end">
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
        </div>
      </div>

      {/* Debug Info */}
      {/* <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
        Debug: LessonID: {lessonId} | IsTemplate: {String(isTemplate)} | Files: {files.length} | Loading: {String(isLoadingFiles)}
      </div> */}

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
            <span className="font-semibold">Files </span>
          </AccordionTrigger>
          <AccordionContent className="mt-2 overflow-x-auto">
            {canEdit && (
              <div className="flex justify-end mb-2">
                <UploadFileDialog
                  lessonPlanId={lessonPlan.id}
                  isGeneric={isTemplate}
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
                onManageVisibility={!isTemplate || isSuperUser ? handleManageFileVisibility : undefined}
                isGeneric={isTemplate && isSuperUser}
                onEdit={handleEditFile}
                onDelete={handleDeleteFile}
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Assignments */}
        <AccordionItem value="assignments" className="border-none">
          <AccordionTrigger className="bg-orange-500 text-white px-3 sm:px-4 py-2 rounded flex justify-between items-center">
            <span className="font-semibold">Assignments</span>
          </AccordionTrigger>
          <AccordionContent className="mt-2 overflow-x-auto">
            {canEdit && (
              <div className="flex justify-end mb-2">
                <UploadAssignmentDialog
                  lessonPlanId={lessonPlan.id}
                  onAssignmentUploaded={(newAssignment) => {
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
                onManageVisibility={!isTemplate || isSuperUser ? handleManageAssignmentVisibility : undefined}
                isGeneric={isTemplate && isSuperUser}
                onEdit={handleEditAssignment}
                onDelete={handleDeleteAssignment}
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

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {/* File Visibility Dialog */}
      {fileToManageVisibility && (
        <ContentVisibilityDialog
          isOpen={!!fileToManageVisibility}
          onClose={() => setFileToManageVisibility(null)}
          contentType="file"
          contentId={fileToManageVisibility.id}
          contentName={fileToManageVisibility.name}
          lessonPlanId={lessonId}
          classes={lessonPlan?.classes || []}
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
          lessonPlanId={lessonId} 
          classes={lessonPlan?.classes || []}
          onSuccess={() => {
            fetchAssignments();
            setAssignmentToManageVisibility(null);
          }}
        />
      )}

      {/* Success Dialog (for template actions) */}
      {successDialogState && (
        <TemplateCopySuccessDialog
          isOpen={successDialogState.isOpen}
          onContinue={handleSuccessContinue}
          actionType={successDialogState.actionType}
        />
      )}

      {/* File Edit Dialog */}
      {fileToEdit && (
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

      {/* Assignment Edit Dialog */}
      {assignmentToEdit && (
        <EditAssignmentDialog
          assignment={assignmentToEdit}
          isOpen={!!assignmentToEdit}
          onClose={() => setAssignmentToEdit(null)}
          onUpdate={() => {
            fetchAssignments();
            setAssignmentToEdit(null);
          }}
          currentLessonPlanId={lessonId}
        />
      )}

      {/* Delete Confirmation Dialogs can be added here */}
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