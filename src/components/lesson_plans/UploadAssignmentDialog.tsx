import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { createAssignment } from '@/src/app/actions/assignmentActions';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useState } from 'react';

interface AssignmentRecord {
    id: string;
    name: string;
    fileType?: string;
    activityType?: string;
    createdAt?: string;
    dueDate?: string;
    size?: string | number;
  }


// Dialog for uploading an assignment
export default function UploadAssignmentDialog({
  lessonPlanId,
  onAssignmentUploaded,
}: {
  lessonPlanId: string;
  onAssignmentUploaded: (assignment: AssignmentRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [activityType, setActivityType] = useState('interactive');
  const [file, setFile] = useState<File | null>(null);
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async () => {
    const fd = new FormData();
    fd.append('name', name);
    fd.append('activityType', activityType);
    fd.append('dueDate', dueDate);
    if (file) {
      fd.append('file', file);
    }
    // Create assignment record using our action.
    const res = await createAssignment({
      name,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      lessonPlanIds: [lessonPlanId],
    });
    if (res.success) {
      onAssignmentUploaded(res.data);
      setOpen(false);
      setName('');
      setActivityType('interactive');
      setFile(null);
      setDueDate('');
    } else {
      console.error(res.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 text-white" size="sm">Upload</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Assignment Name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="border p-2 w-full rounded" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
            <option value="interactive">Interactive</option>
            <option value="presentation">Presentation</option>
          </select>
          <Input type="file" accept=".pdf,.ppt,.pptx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit}>Submit</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}