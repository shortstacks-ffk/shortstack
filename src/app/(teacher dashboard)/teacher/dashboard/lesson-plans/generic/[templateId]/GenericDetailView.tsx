'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { getLessonPlanByID, updateGenericLessonPlan, copyGenericLessonPlanToUser } from '@/src/app/actions/lessonPlansActions';
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

interface GenericDetailViewProps {
  templateId: string;
}

export default function GenericDetailView({ templateId }: GenericDetailViewProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [template, setTemplate] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', gradeLevel: 'all' });
  const [error, setError] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddToClassDialogOpen, setIsAddToClassDialogOpen] = useState(false);

  const isSuperUser = session?.user?.role === 'SUPER';
  const canEdit = isSuperUser;

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

  // Save handler: update via action function and update state
  async function handleSave() {
    if (!canEdit) {
      setError('You do not have permission to edit this template');
      return;
    }
    
    try {
      // Make a copy of files before updating
      const currentFiles = template.files || [];
      
      // Update the template (only super users can do this)
      const res = await updateGenericLessonPlan(templateId, {
        name: form.name,
        description: form.description,
        gradeLevel: form.gradeLevel,
      });
      
      if (res.success) {
        // Update template but preserve files
        setTemplate({
          ...res.data,
          files: currentFiles
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
  
  // Refetch template data
  async function fetchTemplate() {
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
        }
        setError(null);
      } else {
        setError(res.error || 'Failed to fetch template');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
      console.error('Error fetching template:', error);
    }
  }

  // Format created date
  const formattedDate = template?.createdAt 
    ? new Date(template.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]">Loading...</div>;
  if (!template) return <div className="flex justify-center items-center min-h-[60vh]">Template not found</div>;

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

      {/* Desktop Back Button */}
      {/* <div className="hidden sm:block">
        <Button variant="ghost" className="mb-4" asChild>
          <Link href={getBackUrl()}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            {getBackLabel()}
          </Link>
        </Button>
      </div> */}

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
          
          {!isSuperUser && (
            <Button
              onClick={() => setIsAddToClassDialogOpen(true)}
              size="sm" 
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <BookPlus className="h-4 w-4 mr-2" />
              Assign to Class
            </Button>
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

      {/* Accordion for Files */}
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
                  isTemplate={true}
                  onFileUploaded={(newFile) =>
                    setTemplate((prev: any) => ({
                      ...prev,
                      files: [...(prev.files || []), newFile],
                    }))
                  }
                />
              </div>
            )}
            
            {/* File Table */}
            <FileTable 
              files={template.files || []} 
              onUpdate={async () => {
                // Refetch the template to update the UI
                await fetchTemplate();
              }}
              canDelete={canEdit}
            />
            
            {(!template.files || template.files.length === 0) && (
              <div className="text-center py-4 text-gray-500">
                No files have been uploaded yet.
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

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}