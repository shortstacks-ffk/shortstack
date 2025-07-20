'use client';

import { useEffect, useState } from 'react';
import { getLessonPlansByClass } from '@/src/app/actions/lessonPlansActions';
import LessonPlanCard from '@/src/components/lessonPlans/LessonPlanCard';
import AddLessonPlanToClassCard from '@/src/components/lessonPlans/AddLessonPlanToClassCard';
import AddLessonPlanToClassDialog from '@/src/components/lessonPlans/AddLessonPlanToClassDialog';
import Breadcrumbs from '@/src/components/Breadcrumbs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface LessonPlansListProps {
  classCode: string;
  cName: string;
}

export default function LessonPlansList({ classCode, cName }: LessonPlansListProps) {
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLessonPlans = async () => {
    setLoading(true);
    try {
      const response = await getLessonPlansByClass(classCode);
      if (response.success) {
        setLessonPlans(response.data || []);
      } else {
        toast.error(response.error || 'Failed to fetch lesson plans');
        setLessonPlans([]);
      }
    } catch (error) {
      console.error('Error fetching lesson plans:', error);
      toast.error('An error occurred while fetching lesson plans');
      setLessonPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessonPlans();
  }, [classCode]);

  return (
    <div className="space-y-6">
      {/* <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/teacher/dashboard' },
          { label: cName, href: `/teacher/dashboard/classes/${classCode}` },
          { label: 'Lesson Plans', href: `/teacher/dashboard/classes/${classCode}/lesson-plans` },
        ]}
      /> */}
      
      <h2 className="text-xl font-semibold">Lesson Plans</h2>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {lessonPlans.map((plan) => (
            <LessonPlanCard 
              key={plan.id}
              plan={plan}
              classCode={classCode}
              onUpdate={fetchLessonPlans}
              viewContext='class'
            />
          ))}
          
          <AddLessonPlanToClassCard onClick={() => setIsDialogOpen(true)} />
        </div>
      )}
      
      <AddLessonPlanToClassDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        classCode={classCode}
        className={cName}
        onSuccess={fetchLessonPlans}
      />
    </div>
  );
}
