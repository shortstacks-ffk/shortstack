"use server";

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

// Types
interface BillData {
  title: string;
  amount: number;
  dueDate: Date;
  description?: string;
  frequency: string;
  classId?: string;
  status?: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
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
      return { success: false, error: "Usuario no autorizado" };
    }

    const data = {
      title: formData.get("title") as string,
      amount: parseFloat(formData.get("amount") as string),
      dueDate: new Date(formData.get("dueDate") as string),
      description: formData.get("description") as string,
      frequency: formData.get("frequency") as string,
      status: "PENDING" as const,
    };

    if (!data.title || !data.amount || !data.dueDate || !data.frequency) { 
      return { success: false, error: "Faltan campos requeridos" };
    }

    const newBill = await db.bill.create({ data });

    revalidatePath("/dashboard/bills");
    return { success: true, data: newBill };
  } catch (error) {
    console.error("Error al crear factura:", error);
    return { success: false, error: "Error al crear la factura" };
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
      return { success: false, error: "Usuario no autorizado" };
    }

    // Verificar que la clase pertenece al usuario
    const classExists = await db.class.findFirst({
      where: { id: classId, userId },
    });

    if (!classExists) {
      return { success: false, error: "Clase no encontrada" };
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
    console.error("Error al asignar factura:", error);
    return { success: false, error: "Error al asignar la factura" };
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
      return { success: false, error: "Usuario no autorizado" };
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
    console.error("Error al obtener facturas:", error);
    return { success: false, error: "Error al obtener las facturas" };
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
      return { success: false, error: "Usuario no autorizado" };
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
    console.error("Error al actualizar estado de pago:", error);
    return { success: false, error: "Error al actualizar el estado de pago" };
  }
}

// Delete Bill
export async function deleteBill(id: string): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Usuario no autorizado" };
    }

    await db.bill.delete({
      where: { id },
    });

    revalidatePath("/dashboard/bills");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar factura:", error);
    return { success: false, error: "Error al eliminar la factura" };
  }
}
