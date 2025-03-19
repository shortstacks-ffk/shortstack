'use client';

import { useState, useRef } from 'react';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { toast } from 'react-hot-toast';
import { updateStudent } from '@/src/app/actions/studentActions';

interface EditStudentFormProps {
  classCode: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    schoolName: string;
    schoolEmail: string; // Add this missing field
  };
  onClose: () => void;
}

export function EditStudentForm({
  classCode,
  student,
  onClose
}: EditStudentFormProps) {
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(formRef.current!);
      const result = await updateStudent(formData, classCode, student.id);
      
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Student updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input 
            id="firstName" 
            name="firstName" 
            defaultValue={student.firstName}
            required 
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input 
            id="lastName" 
            name="lastName" 
            defaultValue={student.lastName}
            required 
          />
        </div>
      </div>
      <div>
        <Label htmlFor="schoolName">School Name</Label>
        <Input 
          id="schoolName" 
          name="schoolName" 
          defaultValue={student.schoolName}
          required 
        />
      </div>
      <div>
        <Label htmlFor="schoolEmail">School Email</Label>
        <Input 
          id="schoolEmail" 
          name="schoolEmail" 
          type="email" 
          defaultValue={student.schoolEmail}  // Add the default value
          placeholder="example@school.edu" 
          required 
        />
      </div>
      <div>
        <Label htmlFor="password">New Password (Optional)</Label>
        <Input 
          id="password" 
          name="password" 
          type="password"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border rounded-md hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update Student'}
        </button>
      </div>
    </form>
  );
}