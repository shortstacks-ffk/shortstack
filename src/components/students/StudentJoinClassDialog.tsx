'use client';

import { useState, FormEvent } from 'react';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';
import { useToast } from "@/src/components/ui/use-toast";
import { joinClass } from '@/src/app/actions/studentActions';

interface StudentJoinClassDialogProps {
  onJoinSuccess: (classData: any) => void;
  onClose: () => void;
}

export function StudentJoinClassDialog({ onJoinSuccess, onClose }: StudentJoinClassDialogProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate class code here or fetch its details first if needed
      const joinResult = await joinClass(code);
      if (!joinResult.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: joinResult.error || "Unable to join class"
        });
        return;
      }
      toast({
        title: "Success",
        description: `Joined class successfully`
      });
      onJoinSuccess(joinResult.data);
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to join class"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="code">Class Code</Label>
        <Input
          id="code"
          name="code"
          placeholder="Enter class code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Joining...' : 'Join Class'}
        </Button>
      </div>
    </form>
  );
}