
import { getClasses } from "@/src/app/actions/classActions"
import DashboardClient from "./DashboardClient"
import { getRandomColorClass } from "@/src/lib/colorUtils"

export default async function DashboardPage() {
  const classes = await getClasses()
  const classesWithColors = classes.map(cls => ({
    ...cls,
    colorClass: getRandomColorClass(cls.id)
  }))

  return <DashboardClient classes={classesWithColors} />
}