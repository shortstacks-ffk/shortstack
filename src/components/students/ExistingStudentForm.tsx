'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAvailableStudents, addExistingStudentToClass } from '@/src/app/actions/studentActions';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';
import { toast } from 'react-hot-toast';
import { Checkbox } from "@/src/components/ui/checkbox";
import { Loader2 } from 'lucide-react';
import { CheckedState } from '@radix-ui/react-checkbox';

interface ExistingStudentFormProps {
  classCode: string;
  onClose: () => void;
}

interface AvailableStudent {
  id: string;
  firstName: string;
  lastName: string;
  schoolEmail: string;
}

export function ExistingStudentForm({ classCode, onClose }: ExistingStudentFormProps) {
  const [students, setStudents] = useState<AvailableStudent[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [processingStatus, setProcessingStatus] = useState<string>('');

  useEffect(() => {
    const loadAvailableStudents = async () => {
      try {
        setLoading(true);
        const result = await getAvailableStudents(classCode);
        if (result.success && result.data) {
          setStudents(result.data);
        } else {
          toast.error(result.error || 'Failed to load available students');
        }
      } catch (error) {
        console.error('Error loading students:', error);
        toast.error('Error loading students');
      } finally {
        setLoading(false);
      }
    };
  
    loadAvailableStudents();
  }, [classCode]);

  // Use useCallback to memoize these functions to prevent unnecessary re-renders
  const handleStudentToggle = useCallback((studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  }, []);

  // Fix for the infinite loop - memoize this function and handle checked state properly
  const handleToggleAll = useCallback((checked: CheckedState) => {
    if (checked === true) {
      setSelectedStudentIds(students.map(student => student.id));
    } else {
      setSelectedStudentIds([]);
    }
  }, [students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student');
      return;
    }
    
    setSubmitting(true);
    setProgress({ current: 0, total: selectedStudentIds.length, success: 0, failed: 0 });
    
    // Add each student one by one to provide feedback
    for (let i = 0; i < selectedStudentIds.length; i++) {
      const studentId = selectedStudentIds[i];
      const student = students.find(s => s.id === studentId);
      
      setProgress(prev => ({ ...prev, current: i + 1 }));
      setProcessingStatus(`Adding ${student?.firstName} ${student?.lastName}...`);
      
      try {
        const result = await addExistingStudentToClass(studentId, classCode);
        
        if (result.success) {
          setProgress(prev => ({ ...prev, success: prev.success + 1 }));
          setProcessingStatus(`Sending email to ${student?.firstName}...`);
          
          // Check for email failure in a different way - assuming error might be in data or as a separate property
          if (result.data && 'emailFailed' in result.data) {
            // Show warning toast but don't interrupt the process
            toast(`${student?.firstName} ${student?.lastName} added but email notification failed`, {
              icon: '⚠️',
            });
          }
        } else {
          setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
          toast.error(`Failed to add ${student?.firstName} ${student?.lastName}: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error adding student ${studentId}:`, error);
        setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
      }
      
      // Small delay to improve UI feedback
      if (i < selectedStudentIds.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
    
    setProcessingStatus('Completing process...');
    
    // Show completion toast
    toast.success(`Added ${progress.success} students to class`);
    
    // Close the dialog after a short delay
    setTimeout(() => {
      setSubmitting(false);
      onClose();
    }, 1000);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading available students...</div>;
  }

  if (students.length === 0) {
    return (
      <div className="p-4 text-center">
        <p>No available students found.</p>
        <p className="text-sm text-muted-foreground mt-2">
          All students have already been added to this class or no students exist in the system.
        </p>
        <Button 
          variant="outline" 
          onClick={onClose} 
          className="mt-4"
        >
          Close
        </Button>
      </div>
    );
  }

  // Calculate if all students are selected
  const allSelected = students.length > 0 && selectedStudentIds.length === students.length;
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-2">
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-2">
          <Label className="text-base">Available Students</Label>
          <div className="flex items-center">
            <Checkbox 
              id="select-all"
              checked={allSelected}
              onCheckedChange={handleToggleAll}
              className="mr-2"
            />
            <Label htmlFor="select-all" className="text-sm cursor-pointer">
              {allSelected ? "Deselect All" : "Select All"}
            </Label>
          </div>
        </div>

        <div className="border rounded-md overflow-auto max-h-60">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="w-10 p-2 text-left"></th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student) => (
                <tr 
                  key={student.id} 
                  className={`hover:bg-muted/30 ${selectedStudentIds.includes(student.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="p-2">
                    <Checkbox 
                      checked={selectedStudentIds.includes(student.id)}
                      onCheckedChange={() => handleStudentToggle(student.id)}
                      className="ml-1"
                    />
                  </td>
                  <td className="p-2" onClick={() => handleStudentToggle(student.id)}>
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="p-2 text-sm text-muted-foreground">
                    {student.schoolEmail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {submitting && (
        <div className="bg-muted/30 p-2 rounded-md">
          <div className="mb-1 flex justify-between items-center">
            <span className="text-sm">{processingStatus || 'Adding students...'}</span>
            <span className="text-sm">{progress.current}/{progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-green-600">{progress.success} added</span>
            <span className="text-red-500">{progress.failed} failed</span>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={selectedStudentIds.length === 0 || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding Students...
            </>
          ) : (
            `Add ${selectedStudentIds.length > 0 ? selectedStudentIds.length : ''} Student${selectedStudentIds.length !== 1 ? 's' : ''}`
          )}
        </Button>
      </div>
    </form>
  );
}