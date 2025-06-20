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

interface LessonPlan {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  assignments?: any[];
  genericLessonPlanId?: string;
  __typename?: string;
  gradeLevel?: string;
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

  // Calculate these after lessonPlan is loaded
  const isTemplate = lessonPlan && (!!lessonPlan.genericLessonPlanId || lessonPlan.__typename === 'GenericLessonPlan');
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

  // Function to fetch files from database
  const fetchFiles = async (forceIsGeneric?: boolean) => {
    if (!lessonId) return;
    
    try {
      setIsLoadingFiles(true);
      console.log('Fetching files for lessonId:', lessonId);
      
      // IMPORTANT: Always set isGeneric to false for the lesson plan detail view
      // The template check was causing the error
      const isGenericValue = false; // Force this to false
      console.log('Using isGeneric value:', isGenericValue);
      
      const result = await getFiles(lessonId, isGenericValue);
      console.log('getFiles result:', result);
      
      if (result.success) {
        console.log('Files fetched successfully:', result.files);
        setFiles(result.files || []);
      } else {
        console.error('Failed to fetch files:', result.error);
        setFiles([]);
        toast.error('Failed to load files: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
      toast.error('Error loading files');
    } finally {
      setIsLoadingFiles(false);
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
          setLessonPlan(res.data);
          if (res.data) {
            setForm({
              name: res.data.name,
              description: res.data.description || '',
            });
            
            // Check if this is a generic lesson plan by looking at the data structure
            const isGenericPlan = res.data.__typename === 'GenericLessonPlan' || 
                                 res.data.gradeLevel !== undefined || 
                                 res.data.genericLessonPlanId !== undefined;
            
            console.log('Detected plan type - isGeneric:', isGenericPlan);
            console.log('Plan data:', res.data);
            
            // Fetch files immediately after we know the plan type
            setTimeout(() => fetchFiles(false), 100);
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
  }, [lessonId]);

  // Refresh files when the files accordion is opened
  useEffect(() => {
    if (accordionValue === 'files') {
      fetchFiles(false);
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
    setTimeout(() => fetchFiles(false), 500);
  };

  // Changes for assignment functionality:

  // 1. First add this function to fetch assignments when needed
  const fetchAssignments = async () => {
    try {
      console.log('Fetching assignments for lessonId:', lessonId);
      const res = await getLessonPlanByID(lessonId);
      if (res.success && res.data) {
        // Update the lesson plan with new assignments data
        setLessonPlan((prev: LessonPlan | null) => ({
          ...prev,
          assignments: res.data.assignments || []
        }));
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to refresh assignments');
    }
  };

  // 2. Add useEffect to refresh assignments when that section is opened
  useEffect(() => {
    if (accordionValue === 'assignments') {
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
                onUpdate={fetchFiles} // Refresh files from database after any update
                canDelete={canEdit}
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Assignments - only show for normal lesson plans */}
        {!isTemplate && (
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
                      setLessonPlan((prev: any) => ({
                        ...prev,
                        assignments: [...(prev.assignments || []), newAssignment],
                      }));
                      // Refresh assignments after a short delay
                      setTimeout(fetchAssignments, 500);
                    }}
                  />
                </div>
              )}
              <AssignmentTable 
                assignments={lessonPlan.assignments || []} 
                onUpdate={() => {
                  // Call the fetchAssignments function to refresh assignments
                  fetchAssignments();
                }} 
              />
              
              {(!lessonPlan.assignments || lessonPlan.assignments.length === 0) && (
                <div className="text-center py-4 text-gray-500">
                  No assignments have been created yet.
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}