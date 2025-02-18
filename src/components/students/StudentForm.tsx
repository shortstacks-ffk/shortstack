'use client';

import { useRef, useState } from 'react';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { toast } from 'react-hot-toast';
import { createStudent, updateStudent } from '@/src/app/actions/studentActions';

interface StudentFormProps {
  classId: string;
  maxStudents: number;
  currentStudentCount: number;
  onClose: () => void;
  studentToEdit?: any;
}

export function StudentForm({
  classId,
  maxStudents,
  currentStudentCount,
  onClose,
  studentToEdit
}: StudentFormProps) {
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const clientAction = async (formData: FormData) => {
    try {
      setLoading(true);
      const result = studentToEdit 
        ? await updateStudent(formData, classId, studentToEdit.id)
        : await createStudent(formData, classId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(studentToEdit ? 'Student updated' : 'Student added');
      formRef.current?.reset();
      onClose();
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form ref={formRef} action={clientAction} className="space-y-4 p-4 border rounded-md bg-muted/50">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={studentToEdit?.firstName}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={studentToEdit?.lastName}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="schoolName">School Name</Label>
        <Input
          id="schoolName"
          name="schoolName"
          defaultValue={studentToEdit?.schoolName}
          required
        />
      </div>
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          defaultValue={studentToEdit?.username}
          required
        />
      </div>
      <div>
        <Label htmlFor="password">
          {studentToEdit ? 'New Password (leave blank to keep current)' : 'Password'}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required={!studentToEdit}
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
          {loading ? 'Processing...' : (studentToEdit ? 'Update Student' : 'Add Student')}
        </button>
      </div>
    </form>
  );
}