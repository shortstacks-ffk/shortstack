'use client';

import { useEffect, useState } from 'react';
import {
  getLessonPlansByClass,
  createLessonPlan,
} from '@/src/app/actions/lessonPlansActions';

interface LessonPlansProps {
  classCode: string;
}

export function LessonPlans({ classCode }: LessonPlansProps) {
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    async function fetchData() {
      const response = await getLessonPlansByClass(classCode);
      if (response.success) {
        setLessonPlans(response.data);
      } else {
        setError(response.error || 'Failed to load lesson plans');
      }
      setLoading(false);
    }
    fetchData();
  }, [classCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const response = await createLessonPlan({
      name: form.name,
      description: form.description,
      classCode,
    });
    if (response.success) {
      setLessonPlans([...lessonPlans, response.data]);
      setForm({ name: '', description: '' });
    } else {
      setError(response.error || 'Failed to create lesson plan');
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Lesson Plans</h2>
      {lessonPlans.length === 0 ? (
        <div>
          <p>No lesson plans found. Create one:</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
              className="border p-2"
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="border p-2"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2"
            >
              Create Lesson Plan
            </button>
          </form>
        </div>
      ) : (
        lessonPlans.map((plan) => (
          <div key={plan.id} className="p-4 border rounded">
            <h3 className="font-bold">{plan.name}</h3>
            <p className="text-sm mb-2">{plan.description}</p>
            {/* Files Table */}
            <h4 className="font-semibold mt-4">Files</h4>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Name</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {plan.files.map((file: any) => (
                  <tr key={file.id} className="border-b">
                    <td className="py-2">{file.name}</td>
                    <td>{file.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Assignments Table */}
            <h4 className="font-semibold mt-4">Assignments</h4>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Name</th>
                  <th>Description</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {plan.assignments.map((assignment: any) => (
                  <tr key={assignment.id} className="border-b">
                    <td className="py-2">{assignment.name}</td>
                    <td>{assignment.description}</td>
                    <td>
                      {assignment.dueDate ? assignment.dueDate : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
