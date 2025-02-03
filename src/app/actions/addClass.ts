'use server';

import { db } from "@/src/lib/db";
import { auth } from "@clerk/nextjs/server";
// import { error } from "console";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";




interface ClassData {
    name: string;
    code: number;
    numberOfStudents: number;
    cadence: string;
    day: string;
    time: string;
    grade: string;
    emoji: string;
}

interface ClassResult {
    data?: ClassData;
    error?: string;
}


async function addClass(formData: FormData): Promise<ClassResult> {
    const classData = {
        name: formData.get("name"),
        code: Number.parseInt(formData.get("code") as string),
        numberOfStudents: Number.parseInt(formData.get("numberOfStudents") as string),
        cadence: formData.get("cadence"),
        day: formData.get("day"),
        time: formData.get("time"),
        grade: formData.get("grade"),
        emoji: formData.get("emoji"),
    }

    if (!classData.name || !classData.code || !classData.numberOfStudents || !classData.cadence || !classData.day || !classData.time || !classData.grade || !classData.emoji) {
        console.error("Missing required fields:", classData);
        return { error: "Missing required fields" };
      }

    const name: string = classData.name.toString();
    const code: number = classData.code;
    const numberOfStudents: number = classData.numberOfStudents;
    const cadence: string = classData.cadence.toString();
    const day: string = classData.day.toString();
    const time: string = classData.time.toString();
    const grade: string = classData.grade.toString();
    const emoji: string = classData.emoji.toString();

    // Get logged in user
    const { userId } = await auth();
//  Check for user
    if (!userId) {
        return { error: "User not logged in" };
    }

    // DEBUGGING
    console.log("Form Data:", {
        name: classData.name,
        code: classData.code,
        numberOfStudents: classData.numberOfStudents,
        cadence: classData.cadence,
        day: classData.day,
        time: classData.time,
        grade: classData.grade,
        emoji: classData.emoji,
      });



    try {
        
        const cData: ClassData =  await db.class.create({
            data: {
                name,
                code,
                numberOfStudents,
                cadence,
                day,
                time,
                grade,
                emoji,
                userId,
            },
        });


        revalidatePath("/");

        return { data: cData };
    } catch (error) {
        console.log("Error creating class:", error.stack);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            return { error: "A class with this name or code already exists." };
          }
        }
        return { error: "Failed to add class" };
    }

    // const cData: ClassData = {
    //     name,
    //     code,
    //     numberOfStudents,
    //     cadence,
    //     day,
    //     time,
    //     grade,
    //     emoji,
    // }

    
    
}

export default addClass;