'use client';

import { useState } from 'react';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';
import { Checkbox } from '@/src/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import { createStudent } from '@/src/app/actions/studentActions';
import { AlertCircle } from 'lucide-react';

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
  const [generatePassword, setGeneratePassword] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // if (currentStudentCount >= maxStudents) {
    //   toast.error('Maximum number of students reached');
    //   return;
    // }

    setLoading(true);
    setErrorMessage(null);
    
    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      // Add flag for password generation
      formData.append('generatePassword', generatePassword.toString());
      
      // Make sure classCode is in the formData
      formData.append('classCode', classCode);
      
      const result = await createStudent(formData, classCode);

      if (!result.success) {
        // Check for email in use errors
        if (result.error && result.error.includes("email")) {
          if (result.error.includes("TEACHER")) {
            setErrorMessage("This email is already in use by a teacher in the system. Please use a different email.");
          } else {
            setErrorMessage("This email is already in use by another user. Please use a different email.");
          }
        } else {
          toast.error(result.error || 'Failed to add student');
        }
        setLoading(false);
        return;
      }

      toast.success('Student added successfully');
      form.reset();
      onClose();
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      {/* Adding a hidden input field with the class code */}
      <input type="hidden" name="classCode" value={classCode} />
      
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <p>{errorMessage}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input 
            id="firstName" 
            name="firstName" 
            required 
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input 
            id="lastName" 
            name="lastName" 
            required 
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="schoolEmail">Email</Label>
        <Input 
          id="schoolEmail" 
          name="schoolEmail" 
          type="email" 
          placeholder="student@school.edu" 
          required 
        />
      </div>
      
      <div className="flex items-center space-x-2 py-2">
        <Checkbox 
          id="generatePassword" 
          checked={generatePassword}
          onCheckedChange={(checked) => {
            setGeneratePassword(checked === true);
          }} 
        />
        <Label 
          htmlFor="generatePassword" 
          className="cursor-pointer"
        >
          Generate temporary password and send invitation email
        </Label>
      </div>
      
      {!generatePassword && (
        <div>
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            name="password" 
            type="password" 
            required={!generatePassword} 
          />
        </div>
      )}
      
      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose} 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Student'}
        </Button>
      </div>
    </form>
  );
}