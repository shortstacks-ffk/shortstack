import { getClasses } from "@/src/app/actions/classActions"
import { getRandomColorClass } from "@/src/lib/colorUtils"
import DashboardClient from "./DashboardClient"

export default async function DashboardPage() {
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