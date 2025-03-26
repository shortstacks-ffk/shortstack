'use client';

import { Button } from '@/src/components/ui/button';
import { useState } from 'react';
import RichEditor from '@/src/components/RichEditor';
import { StudentList } from '@/src/components/students/StudentList';

interface ClassOverviewProps {
    classData: {
        id: string;
        name: string;
        overview?: string;
        code: string;
        students: any[];
    };
    }


const ClassOverview = ({ classData }: ClassOverviewProps) => {
    const [editMode, setEditMode] = useState(false);
    const [overview, setOverview] = useState(classData.overview || '');

    const handleSave = async () => {
        try {
            console.log("Updating class with code:", classData.code);
            
            const response = await fetch('/api/classes/overview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    code: classData.code,
                    overview 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API error details:", errorData);
                throw new Error('Failed to save overview');
            }
            
            const data = await response.json();
            console.log("Update successful:", data);
            setEditMode(false);
        } catch (error) {
            console.error('Failed to save overview:', error);
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Class Overview</h2>
                {editMode ? (
          <div className="space-x-2">
            <Button onClick={handleSave}>Save</Button>
            <Button variant="outline" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditMode(true)}>Edit Overview</Button>
        )}
      </div>

      {editMode ? (
        <RichEditor
          content={overview}
          onChange={setOverview}
          editable={true}
        />
      ) : (
        <div 
          className="prose prose-sm max-w-none p-4 rounded-md"
          dangerouslySetInnerHTML={{ __html: overview || '<p>No overview yet.</p>' }} 
        />
      )}

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Student Management</h3>
        <StudentList
          classCode={classData.code}
          maxStudents={classData.students.length}
        />
      </div>
    </div>
  );
};

export default ClassOverview;