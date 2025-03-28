"use server";

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

// Define types
interface CreateBillData {
  title: string;
  emoji?: string;
  amount: number;
  dueDate: Date;
  description?: string;
  frequency: "ONCE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
}

interface BillResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

type BillStatus = "PENDING" | "ACTIVE" | "PAID" | "CANCELLED";

// Create Bill with class selection
export async function createBill(formData: FormData): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Not authorized" };
    }

    const data: CreateBillData = {
      title: formData.get("title") as string,
      emoji: (formData.get("emoji") as string) ?? "💰",
      amount: parseFloat(formData.get("amount") as string),
      dueDate: new Date(formData.get("dueDate") as string),
      description: formData.get("description") as string,
      frequency: formData.get("frequency") as CreateBillData["frequency"],
    };

    // Get class IDs - now required
    const classIds = formData.getAll("classIds") as string[];

    // Validate required fields
    if (!data.title || !data.amount || !data.dueDate || !data.frequency) {
      return { success: false, error: "Missing required fields" };
    }

    if (!classIds.length) {
      return { success: false, error: "At least one class must be selected" };
    }

    // Verify that all classes belong to this user
    const classes = await db.class.findMany({
      where: {
        id: { in: classIds },
        userId: userId
      }
    });

    // If any class doesn't belong to this user or doesn't exist
    if (classes.length !== classIds.length) {
      return { success: false, error: "One or more selected classes are invalid" };
    }

    // Create the bill with class assignments
    const newBill = await db.bill.create({
      data: {
        ...data,
        class: {
          connect: classIds.map(id => ({ id })) 
        }
      },
      include: {
        class: true
      }
    });

    // Get all students from the selected classes
    const students = await db.student.findMany({
      where: {
        classId: { in: classIds }
      }
    });

    // If there are students, create StudentBill records for each
    if (students.length > 0) {
      await db.studentBill.createMany({
        data: students.map(student => ({
          billId: newBill.id,
          studentId: student.id,
          isPaid: false
        }))
      });
    }

    revalidatePath("/dashboard/bills");
    return { success: true, data: newBill };
  } catch (error) {
    console.error("Create bill error:", error);
    return { success: false, error: "Failed to create bill" };
  }
}

// Get Bills - filter by user's classes
export async function getBills(filters?: {
  classId?: string;
}): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not found" };
    }

    // All bills must be associated with a class owned by this user
    let whereClause: any = {
      class: {
        some: {
          userId: userId
        }
      }
    };

    // Add class filter if provided
    if (filters?.classId) {
      whereClause = {
        class: {
          some: { 
            id: filters.classId,
            userId
          }
        }
      };
    }

    const bills = await db.bill.findMany({
      where: whereClause,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            emoji: true,
            code: true,
          },
        },
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
    console.error("Error fetching bills:", error);
    return { success: false, error: "Failed to fetch bill details" };
  }
}

// Get a single Bill - ensure it belongs to the user
export async function getBill(billId: string): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not found" };
    }

    const bill = await db.bill.findFirst({
      where: {
        id: billId,
        class: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            emoji: true,
            code: true,
          },
        },
        students: {
          include: {
            student: true
          }
        }
      },
    });

    if (!bill) {
      return { success: false, error: "Bill not found or doesn't belong to you" };
    }

    return { success: true, data: bill };
  } catch (error) {
    console.error("Error fetching bill:", error);
    return { success: false, error: "Failed to fetch bill details" };
  }
}

// Update Bill
export async function updateBill(billId: string, data: Partial<CreateBillData>): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // First verify the bill belongs to this user
    const billExists = await db.bill.findFirst({
      where: {
        id: billId,
        class: {
          some: {
            userId: userId
          }
        }
      }
    });

    if (!billExists) {
      return { success: false, error: "Bill not found or doesn't belong to you" };
    }

    const updateData: any = {
      title: data.title,
      amount: data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      description: data.description,
      frequency: data.frequency,
    };

    const bill = await db.bill.update({
      where: { id: billId },
      data: updateData
    });

    revalidatePath('/dashboard/bills');
    return { success: true, data: bill };
  } catch (error: any) {
    console.error("Update bill error:", error?.message || "Unknown error");
    return { success: false, error: "Failed to update bill" };
  }
}

// New function to copy bill to additional classes
interface CopyBillToClassParams {
  billId: string;
  targetClassIds: string[];
}

export async function copyBillToClasses({
  billId,
  targetClassIds
}: CopyBillToClassParams): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Verify the bill exists and belongs to this user
    const originalBill = await db.bill.findFirst({
      where: {
        id: billId,
        class: {
          some: {
            userId
          }
        }
      },
      include: {
        class: true
      }
    });

    if (!originalBill) {
      return { success: false, error: "Bill not found or doesn't belong to you" };
    }

    // 2. Verify all target classes belong to this user
    const targetClasses = await db.class.findMany({
      where: {
        id: { in: targetClassIds },
        userId
      }
    });

    if (targetClasses.length !== targetClassIds.length) {
      return { success: false, error: "One or more target classes are invalid" };
    }

    // 3. Check which classes the bill is already assigned to
    const existingClassIds = originalBill.class.map(cls => cls.id);
    
    // Filter out classes that already have this bill
    const newClassIds = targetClassIds.filter(id => !existingClassIds.includes(id));
    
    if (newClassIds.length === 0) {
      return { success: false, error: "Bill is already assigned to all selected classes" };
    }

    // 4. Update the bill to add the new class connections
    const updatedBill = await db.bill.update({
      where: { id: billId },
      data: {
        class: {
          connect: newClassIds.map(id => ({ id }))
        }
      },
      include: {
        class: true
      }
    });

    // 5. Get all students from the new classes
    const students = await db.student.findMany({
      where: {
        classId: { in: newClassIds }
      }
    });

    // 6. Create StudentBill records for each student in the new classes
    if (students.length > 0) {
      // First check which students already have this bill assigned
      const existingStudentBills = await db.studentBill.findMany({
        where: { billId }
      });
      
      const existingStudentIds = existingStudentBills.map(sb => sb.studentId);
      
      // Only create records for students who don't already have this bill
      const newStudentBills = students
        .filter(student => !existingStudentIds.includes(student.id))
        .map(student => ({
          billId,
          studentId: student.id,
          isPaid: false
        }));
        
      if (newStudentBills.length > 0) {
        await db.studentBill.createMany({
          data: newStudentBills
        });
      }
    }

    revalidatePath("/dashboard/bills");
    revalidatePath("/dashboard/classes");
    
    return { 
      success: true, 
      data: updatedBill,
      message: `Bill successfully assigned to ${newClassIds.length} additional class(es)`
    };
  } catch (error) {
    console.error("Error copying bill to classes:", error);
    return { success: false, error: "Failed to assign bill to additional classes" };
  }
}

// Delete Bill
export async function deleteBill(id: string): Promise<BillResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authorized" };
    }

    // Verify the bill belongs to this user
    const bill = await db.bill.findFirst({
      where: {
        id: id,
        class: {
          some: {
            userId: userId
          }
        }
      }
    });

    if (!bill) {
      return { success: false, error: "Bill not found or doesn't belong to you" };
    }

    // Delete the bill if it belongs to this user
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

    // Verify the bill belongs to this user and the student is in one of their classes
    const billAndStudent = await db.bill.findFirst({
      where: {
        id: billId,
        class: {
          some: {
            userId: userId,
            students: {
              some: {
                id: studentId
              }
            }
          }
        }
      }
    });

    if (!billAndStudent) {
      return { success: false, error: "Bill or student not found, or doesn't belong to your classes" };
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
    console.error("Error updating payment status:", error);
    return { success: false, error: "Failed to update payment status" };
  }
}

// Helper function remains the same
function isValidBillFrequency(frequency: string): boolean {
  const validFrequencies = ["ONCE", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];
  return validFrequencies.includes(frequency);
}