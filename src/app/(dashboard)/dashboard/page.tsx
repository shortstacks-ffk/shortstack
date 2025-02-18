import { getClasses } from "@/src/app/actions/classActions"
import { getRandomColorClass } from "@/src/lib/colorUtils"
import DashboardClient from "./DashboardClient"
import { checkUser } from "@/src/lib/checkUser";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await checkUser();
  
  if (!user) {
    redirect('/teacher/login');
  }
  const response = await getClasses()
  
  if (!response.success || !response.data) {
    // Handle error case - you might want to show an error message
    return <div>Failed to load classes</div>
  }

  const classesWithColors = response.data.map((cls: { id: string }) => ({
    ...cls,
    colorClass: getRandomColorClass(cls.id)
  }))

  return <DashboardClient classes={classesWithColors} />
}
