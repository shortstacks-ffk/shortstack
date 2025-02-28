import { Button } from '@/src/components/ui/button';

interface FileRecord {
    id: string;
    name: string;
    fileType?: string;
    activityType?: string;
    createdAt?: string;
    size?: string | number;
  }

  export default function FileTable({ files }: { files: FileRecord[] }) {
    return (
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">File Type</th>
            <th className="p-2">Activity</th>
            <th className="p-2">Created</th>
            <th className="p-2">Size</th>
            <th className="p-2">Assign</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.id}>
              <td className="p-2">{f.name}</td>
              <td className="p-2">{f.fileType || 'N/A'}</td>
              <td className="p-2">{f.activityType || 'N/A'}</td>
              <td className="p-2">{f.createdAt ? new Date(f.createdAt).toLocaleDateString() : 'N/A'}</td>
              <td className="p-2">{f.size || 'N/A'}</td>
              <td className="p-2">
                <Button variant="secondary" size="sm">Assign</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  
