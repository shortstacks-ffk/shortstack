'use client';

import { useState, useEffect } from 'react';
import { getStudentsByClass, deleteStudent } from '@/src/app/actions/studentActions';
import { AddStudentForm } from './AddStudentForm';
import { EditStudentForm } from './EditStudentForm'; 
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/src/components/ui/dialog';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  schoolName: string;
  progress: number;
}

interface StudentListProps {
  classCode: string;
  maxStudents: number;
}

export function StudentList({ classCode, maxStudents }: StudentListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  
  const loadStudents = async () => {
    try {
      const result = await getStudentsByClass(classCode);
      if (result.success) {
        setStudents(result.data);
      } else {
        toast.error('Failed to load students');
      }
    } catch (error) {
      toast.error('Error loading students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [classCode]);

  const handleDelete = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
      const result = await deleteStudent(classCode, studentId);
      if (result.success) {
        toast.success('Student deleted');
        loadStudents();
      } else {
        toast.error(result.error || 'Failed to delete student');
      }
    } catch (error) {
      toast.error('Error deleting student');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {students.length} students enrolled
        </h2>
        <button
          onClick={() => setShowAddDialog(true)}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          Add Student
        </button>
      </div>

      {/* Add Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <AddStudentForm
            classCode={classCode}
            maxStudents={maxStudents}
            currentStudentCount={students.length}
            onClose={() => {
              setShowAddDialog(false);
              loadStudents();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <EditStudentForm
              classCode={classCode}
              student={editingStudent}
              onClose={() => {
                setEditingStudent(null);
                loadStudents();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {students.length === 0 ? (
        <p className="text-center text-gray-500">
          No students yet. Add your first student!
        </p>
      ) : students.length > 0 && (
        <div className="rounded-md border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4">{student.firstName} {student.lastName}</td>
                  <td className="px-6 py-4">{student.username}</td>
                  <td className="px-6 py-4">{student.schoolName}</td>
                  <td className="px-6 py-4">{student.progress}%</td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      onClick={() => setEditingStudent(student)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}