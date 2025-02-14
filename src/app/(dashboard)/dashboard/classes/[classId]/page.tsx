import { getClassData } from '@/src/app/actions/classActions';
import ClassTabs from '@/src/components/class/ClassTabs';
import { notFound } from 'next/navigation';



    export default async function ClassPage({
        params,
    }: {
        params: Promise<{ classId: string }>;
    }) {
        const classCode = (await params).classId;
        const classData = await getClassData(classCode);
        if (!classData) {
          notFound();
        }
        // return <div>Class: {classCode}</div>
        return (
          <main className="container mx-auto p-4">
          <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">
              {classData.emoji} {classData.name}
            </h1>
            <ClassTabs classData={classData} />
          </div>
        </main>
        );
      }