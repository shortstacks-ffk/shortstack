'use client';

import { Card, CardContent } from '@/src/components/ui/card';
import { Plus } from 'lucide-react';

interface AddLessonPlanToClassCardProps {
  onClick: () => void;
}

export default function AddLessonPlanToClassCard({ onClick }: AddLessonPlanToClassCardProps) {
  return (
    <Card
      className="border-4 border-gray-300 w-[250px] h-[250px] rounded-xl bg-gray-50 flex flex-col justify-center items-center cursor-pointer hover:border-gray-400 transition-colors"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Plus className="h-10 w-10 text-primary" />
        </div>
        <h3 className="font-medium text-gray-700">Add Lesson Plan</h3>
        <p className="text-sm text-gray-500 mt-2">
          Add a lesson plan from your existing lesson plans or from lesson templates
        </p>
      </CardContent>
    </Card>
  );
}