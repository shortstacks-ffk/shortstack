'use client';

import { useState } from 'react';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export function StudentJoinClass() {
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!classCode.trim()) {
      toast.error('Please enter a class code');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/student/join-class', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classCode: classCode.trim() }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to join class');
        return;
      }
      
      toast.success(data.message || 'Successfully joined class');
      setClassCode('');
      
      // Refresh the page or redirect to dashboard
      router.refresh();
      router.push('/student/dashboard');
    } catch (error) {
      console.error('Error joining class:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="classCode" className="block text-sm font-medium">
          Enter Class Code
        </label>
        <Input
          id="classCode"
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          placeholder="Enter the code provided by your teacher"
          required
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={loading || !classCode.trim()}
        className="w-full"
      >
        {loading ? 'Joining...' : 'Join Class'}
      </Button>
    </form>
  );
}