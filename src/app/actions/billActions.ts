"use server";

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

// Types
interface CreateBillData {
  title: string;
  emoji: string;  // Added this as it's required in schema
  amount: number;
  dueDate: Date;
  description?: string;
  frequency: "ONCE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  classIds?: string[];  // Added to handle class assignments
}

interface UpdateBillData {
  title: string;
  amount: number;
  dueDate: string;
  description?: string;
  frequency: string;
  status: string;
}

interface BillResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Create Bill
export async function createBill(formData: FormData): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Not authorized" };
    }

    const data: CreateBillData = {
      title: formData.get("title") as string,
      emoji: formData.get("emoji") as string || "💰", // Default emoji if none provided
      amount: parseFloat(formData.get("amount") as string),
      dueDate: new Date(formData.get("dueDate") as string),
      description: formData.get("description") as string,
      frequency: formData.get("frequency") as CreateBillData["frequency"],
    };

    // Get class IDs if provided
    const classIds = formData.getAll("classIds") as string[];

    // Validate required fields
    if (!data.title || !data.amount || !data.dueDate || !data.frequency) {
      return { success: false, error: "Missing required fields" };
    }

    const newBill = await db.bill.create({
      data: {
        ...data,
        class: {
          connect: classIds.map(id => ({ code: id }))
        }
      }
    });

    revalidatePath("/dashboard/bills");
    return { success: true, data: newBill };
  } catch (error) {
    console.error("Create bill error:", error);
    return { success: false, error: "Failed to create bill" };
  }
}

// Assign Bill to Class
export async function assignBillToClass(
  billId: string,
  classId: string
): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not found" };
    }

    // Verificar que la clase pertenece al usuario
    const classExists = await db.class.findFirst({
      where: { id: classId, userId },
    });

    if (!classExists) {
      return { success: false, error: "Class not found" };
    }

    
    await db.bill.update({
      where: { id: billId },
      data: {
        class: {
          connect: { id: classId },
        },
      },
      include: {
        class: true,
        students: true,
      },
    });

    const students = await db.student.findMany({
      where: { classId },
    });

    await Promise.all(
      students.map((student) =>
        db.studentBill.create({
          data: {
            billId,
            studentId: student.id,
          },
        })
      )
    );

    revalidatePath("/dashboard/bills");
    revalidatePath("/dashboard/classes");
    return { success: true };
  } catch (error) {
    console.error("Error fetching bill:", error);
    return { success: false, error: "Failed to fetch bill details" };
  }
}

//Get a single Bill
export async function getBill(billId: string): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not found" };
    }

    const bill = await db.bill.findUnique({
      where: { id: billId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            emoji: true,
            code: true,
          },
        },
      },
    });

    if (!bill) {
      return { success: false, error: "Bill not found" };
    }

    return { success: true, data: bill };
  } catch (error) {
    console.error("Error fetching bill:", error);
    return { success: false, error: "Failed to fetch bill details" };
  }
}

// Get Bills
export async function getBills(filters?: {
  classId?: string;
  unassigned?: boolean;
}): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not found" };
    }

    let whereClause = {};
    if (filters?.classId) {
      whereClause = {
        classes: {
          some: { id: filters.classId },
        },
      };
    } else if (filters?.unassigned) {
      whereClause = {
        classes: {
          none: {},
        },
      };
    }

    const bills = await db.bill.findMany({
      where: whereClause,
      include: {
        class: true,
        students: {
          include: {
            student: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: bills };
  } catch (error) {
    console.error("Error fetching bill:", error);
    return { success: false, error: "Failed to fetch bill details" };
  }
}

// Update Payment Status
export async function updatePaymentStatus(
  billId: string,
  studentId: string,
  isPaid: boolean
): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not found" };
    }

    const updatedStudentBill = await db.studentBill.update({
      where: {
        billId_studentId: {
          billId,
          studentId,
        },
      },
      data: {
        isPaid,
        paidAt: isPaid ? new Date() : null,
      },
    });

    revalidatePath("/dashboard/bills");
    return { success: true, data: updatedStudentBill };
  } catch (error) {
    console.error("Error updating the bill:", error);
    return { success: false, error: "Failed to update the bill" };
  }
}
// Update Bill
export async function updateBill(
  id: string, 
  data: UpdateBillData
): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authorized" };
    }

    // Validate required fields
    if (!data.title || !data.amount || !data.dueDate || !data.frequency || !data.status) {
      return { success: false, error: "Missing required fields" };
    }

    const updatedBill = await db.bill.update({
      where: { id },
      data: {
        title: data.title,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        description: data.description,
        frequency: data.frequency,
        status: data.status
      }
    });

    revalidatePath("/dashboard/bills");
    return { success: true, data: updatedBill };
  } catch (error) {
    console.error("Update bill error:", error);
    return { success: false, error: "Failed to update bill" };
  }
}

// Delete Bill
export async function deleteBill(id: string): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authorized" };
    }

    await db.bill.delete({
      where: { id },
    });

    revalidatePath("/dashboard/bills");
    return { success: true };
  } catch (error) {
    console.error("Error deleting bill:", error);
    return { success: false, error: "Failed to delete bill" };
  }
}
