// Will get back to this to complete CRUD here


'use server';

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
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

export const deleteClass = async (classId: string) => {
  try {
    await db.class.delete({
      where: { id: classId }
    });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    return { success: false };
  }
};

export const updateClass = async (classId: string, data: {
  name: string;
  emoji: string;
  cadence: string;
  day: string;
  time: string;
  grade: string;
  numberOfStudents: number;
}) => {
  try {
    await db.class.update({
      where: { id: classId },
      data: {
        ...data,
        numberOfStudents: Number(data.numberOfStudents)
      }
    });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error("Update error:", error);
    return { success: false };
  }
};