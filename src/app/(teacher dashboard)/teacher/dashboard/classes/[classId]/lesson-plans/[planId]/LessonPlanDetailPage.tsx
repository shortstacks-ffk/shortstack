'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getLessonPlanByID, updateLessonPlan } from '@/src/app/actions/lessonPlansActions';
import Breadcrumbs from '@/src/components/Breadcrumbs';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/src/components/ui/accordion';
import UploadFileDialog from '@/src/components/lesson_plans/UploadFileDialog';
import FileTable from '@/src/components/lesson_plans/FileTable';
import UploadAssignmentDialog from '@/src/components/lesson_plans/UploadAssignmentDialog';
import AssignmentTable from '@/src/components/lesson_plans/AssignmentTable';
import RichEditor from '@/src/components/RichEditor';


interface LessonPlanDetailProps {
  classId: string;
  planId: string;
}
  
export default function LessonPlanDetailPage({ classId, planId }: LessonPlanDetailProps) {
  const [lessonPlan, setLessonPlan] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | null>(null);  

  // Fetch lesson plan on mount.
  useEffect(() => {
    async function fetchPlan() {
      const res = await getLessonPlanByID(planId);
      if (res.success) {
        setLessonPlan(res.data);
        if (res.data) {
          setForm({
            name: res.data.name,
            description: res.data.description || '',
          });
        }
      } else {
        setError(res.error || null);
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

  if (!lessonPlan) return <div className="flex justify-center items-center min-h-[60vh]">Loading...</div>;

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

  return (
    <div className="w-full lg:w-5/6 xl:w-3/4 mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
      {/* Breadcrumbs - hidden on mobile */}
      <div className="hidden sm:block">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/teacher/dashboard' },
            { label: 'Back to Class', href: `/teacher/dashboard/classes/${classId}` },
            { label: lessonPlan.name, href: '#' },
          ]}
        />
      </div>

      {/* Mobile Back Link */}
      <div className="sm:hidden mb-2">
        <Button variant="ghost" className="p-0 h-auto" asChild>
          <a href={`/teacher/dashboard/classes/${classId}`}>← Back to Class</a>
        </Button>
      </div>

      {/* Header: Title, Edit, Save & Cancel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {editMode ? (
          <div className="flex-1 w-full sm:mr-4">
            <Input
              className="text-xl font-bold"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
        ) : (
          <h1 className="text-2xl sm:text-3xl font-bold break-words">{lessonPlan.name}</h1>
        )}
        {editMode ? (
          <div className="flex items-center gap-2 self-end">
            <Button onClick={handleSave} size="sm" className="sm:size-default">Save</Button>
            <Button variant="secondary" onClick={handleCancel} size="sm" className="sm:size-default">
              Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditMode(true)} size="sm" className="sm:size-default self-end">Edit</Button>
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
                onFileUploaded={(newFile) =>
                  setLessonPlan((prev: any) => ({
                    ...prev,
                    files: [...(prev.files || []), newFile],
                  }))
                }
              />
            </div>
            {/* File Table */}
            <FileTable 
              files={lessonPlan.files || []} 
              onUpdate={async () => {
                // Refetch the lesson plan to update the UI
                const res = await getLessonPlanByID(planId);
                if (res.success) {
                  setLessonPlan(res.data);
                }
              }}
            />
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
              onUpdate={() => {
                // Refresh lesson plan data
                fetchPlan();
              }} 
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
