import { db } from "@/src/lib/db"
import { auth } from "@clerk/nextjs/server"

export const getClasses = async () => {
  const { userId } = await auth();

  if (!userId) return []

  try {
    return await db.class.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 3
    })
  } catch (error) {
    console.error("Error fetching classes:", error)
    return []
  }
}