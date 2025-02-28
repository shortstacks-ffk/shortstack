import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { createFile } from '@/src/app/actions/fileActions';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useState } from 'react';

interface FileRecord {
    id: string;
    name: string;
    fileType?: string;
    activityType?: string;
    createdAt?: string;
    size?: string | number;
  }

// Dialog for uploading a file
export default function UploadFileDialog({
    lessonPlanId,
    onFileUploaded,
  }: {
    lessonPlanId: string;
    onFileUploaded: (file: FileRecord) => void;
  }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [activityType, setActivityType] = useState('interactive');
    const [file, setFile] = useState<File | null>(null);
  
    const handleSubmit = async () => {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('activityType', activityType);
      if (file) {
        fd.append('file', file);
      }
      // Create file record using our action; handle file storage accordingly.
      const res = await createFile({
        name,
        url: '', // Set actual file URL after upload
        lessonPlanIds: [lessonPlanId],
      });
      if (res.success) {
        onFileUploaded(res.data);
        setOpen(false);
        setName('');
        setActivityType('interactive');
        setFile(null);
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
            <DialogTitle>Upload File</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="File Name" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="border p-2 w-full rounded" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
              <option value="interactive">Interactive</option>
              <option value="presentation">Presentation</option>
            </select>
            <Input type="file" accept=".pdf,.ppt,.pptx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }