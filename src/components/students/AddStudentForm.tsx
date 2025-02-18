'use client';

import { useState } from 'react';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { useToast } from "@/src/hooks/use-toast"
import { toast as sonnerToast } from "@/src/components/ui/toast"
import { createStudent } from '@/src/app/actions/studentActions';

interface AddStudentFormProps {
    classCode: string;
    maxStudents: number;
    currentStudentCount: number;
    onClose: () => void;
    }

export function AddStudentForm({
  classCode,
  maxStudents,
  currentStudentCount,
  onClose
}: AddStudentFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStudentCount >= maxStudents) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Maximum number of students reached"
      });
      return;
    }

    setLoading(true);
    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const result = await createStudent(formData, classCode);

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || 'Failed to add student'
        });
        return;
      }

      toast({
        title: "Success",
        description: "Student added successfully"
      });
      form.reset();
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add student"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>
      <div>
        <Label htmlFor="schoolName">School Name</Label>
        <Input id="schoolName" name="schoolName" required />
      </div>
      <div>
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required />
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
          {loading ? 'Adding...' : 'Add Student'}
        </button>
      </div>
    </form>
  );
}