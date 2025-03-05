'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';
import { useToast } from '@/src/hooks/use-toast';

export function StudentJoinClass() {
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!classCode.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a class code.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/student/join-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ 
          variant: 'destructive', 
          title: 'Error', 
          description: data.error || 'Invalid class code.'
        });
        setLoading(false);
        return;
      }
      toast({ title: 'Success', description: 'Class joined successfully.' });
      // Redirect to the class's page, adjust the path as needed
      router.push(`/student/dashboard/classes/${classCode}`);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Unable to join class.' });
      console.error('Join class error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="classCode" className="block text-sm font-medium mb-1">
            Enter class code
          </Label>
          <Input
            id="classCode"
            name="classCode"
            placeholder="e.g. ABC123"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Joining…' : 'Join Class'}
        </Button>
      </form>
    </div>
  );
}