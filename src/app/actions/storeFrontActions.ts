"use server";

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/src/lib/auth"; // Import NextAuth session helper

// Types
interface CreateStoreItemData {
  name: string;
  emoji: string;
  price: number;
  description?: string;
  quantity: number;
  isAvailable: boolean;
}

interface UpdateStoreItemData {
  name: string;
  emoji: string;
  price: number;
  description?: string;
  quantity: number;
  isAvailable: boolean;
}

interface StoreItemResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

interface CopyStoreItemToClassParams {
  storeItemId: string;
  targetClassIds: string[];
}

// Create a new store item
export async function createStoreItem(
  formData: FormData
): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession(); // Use NextAuth session
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    const data: CreateStoreItemData = {
      name: formData.get("name") as string,
      emoji: (formData.get("emoji") as string) || "🛍️",
      price: parseFloat(formData.get("price") as string),
      description: formData.get("description") as string,
      quantity: parseInt(formData.get("quantity") as string, 10) || 0,
      isAvailable: formData.get("isAvailable") === "true",
    };

    const classIds = formData.getAll("classIds") as string[];

    // Validate required fields
    if (!data.name || isNaN(data.price)) {
      return { success: false, error: "Missing required fields" };
    }

    if (!classIds.length) {
      return { success: false, error: "At least one class must be selected" };
    }

    // Verify that all classes belong to this user
    const classes = await db.class.findMany({
      where: {
        id: { in: classIds },
        userId: session.user.id, // Use session.user.id from NextAuth
      },
    });

    if (classes.length !== classIds.length) {
      return { success: false, error: "One or more selected classes are invalid" };
    }

    // Create the store item with class assignments
    const newItem = await db.storeItem.create({
      data: {
        ...data,
        classId: classIds[0], // Track who created the item
        class: {
          connect: classIds.map((id) => ({ id })), // Connect to the selected classes
        },
      },
      include: {
        class: true,
      },
    });

    revalidatePath("/dashboard/storefront");
    return { success: true, data: newItem };
  } catch (error) {
    console.error("Create store item error:", error);
    return { success: false, error: "Failed to create store item" };
  }
}

// Get all store items for the current user
export async function getAllStoreItems(filters?: {
  classId?: string;
}): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession(); // Use NextAuth session
    if (!session?.user?.id) {
      return { success: false, error: "Not authorized" };
    }

    // Validate filters.classId
    if (filters?.classId && typeof filters.classId !== "string") {
      return { success: false, error: "Invalid classId filter" };
    }

    let whereClause: any = {
      class: {
        some: {
          userId: session.user.id, // Use session.user.id from NextAuth
        },
      },
    };

    if (filters?.classId) {
      whereClause = {
        class: {
          some: {
            id: filters.classId,
            userId: session.user.id,
          },
        },
      };
    }

    // Debugging logs
    console.log("Filters:", filters);
    console.log("Where Clause:", whereClause);

    const items = await db.storeItem.findMany({
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
        purchases: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: items };
  } catch (error) {
    console.error("Error fetching store items:", error);
    return { success: false, error: "Failed to fetch store items" };
  }
}

// OLD FUNCTIONAL
// export async function getStoreItem(storeItemId: string): Promise<StoreItemResponse> {
//   try {
//     const session = await getAuthSession(); // Use NextAuth session
//     if (!session?.user?.id) {
//       return { success: false, error: "User not found" };
//     }

//     const storeItem = await db.storeItem.findFirst({
//       where: {
//         id: storeItemId,
//         class: {
//           some: {
//             userId: session.user.id, // Use session.user.id from NextAuth
//           },
//         },
//       },
//       include: {
//         class: {
//           select: {
//             id: true,
//             name: true,
//             emoji: true,
//             code: true,
//           },
//         },
//         purchases: true, // Make sure this is included
//       },
//     });

//     if (!storeItem) {
//       return { success: false, error: "Store item not found or doesn't belong to you" };
//     }

//     return { success: true, data: storeItem };
//   } catch (error) {
//     console.error("Error fetching store item:", error);
//     return { success: false, error: "Failed to fetch store item details" };
//   }
// }

export async function getStoreItem(storeItemId: string): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "User not found" };
    }

    // Verify teacher owns the class associated with the item
    const item = await db.storeItem.findUnique({
      where: { id },
      include: { class: { select: { userId: true, code: true } } }
    });

    if (!item || item.class[0].userId !== session.user.id) {
      return { success: false, error: "Forbidden or Item not found" };
    }

    const updatedItem = await db.storeItem.update({
      where: { id },
      data,
    });

    revalidatePath(`/dashboard/classes/${item.class[0].code}/store`);
    return { success: true, data: updatedItem };
  } catch (error: any) {
    console.error("Update store item error:", error);
    return { success: false, error: "Failed to update store item" };
  }
}

// Copy a store item to multiple classes
export async function copyStoreItemToClasses({
  storeItemId,
  targetClassIds,
}: CopyStoreItemToClassParams): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession(); // Use NextAuth session
    if (!session?.user?.id) {
      return { success: false, error: "Not authorized" };
    }

    // Verify teacher owns the class associated with the item
    const item = await db.storeItem.findUnique({
      where: { id },
      include: { class: { select: { userId: true, code: true } } }
    });

    if (!item || item.class[0].userId !== session.user.id) {
      return { success: false, error: "Forbidden or Item not found" };
    }

    // Delete associated purchases first (or use cascade delete)
    await db.studentPurchase.deleteMany({ 
      where: { 
        itemId: id // Change storeItemId to itemId if that's what your schema uses
      } 
    });

    await db.storeItem.delete({ where: { id } });

    revalidatePath(`/dashboard/classes/${item.class[0].code}/store`);
    return { success: true };
  } catch (error: any) {
    console.error("Delete store item error:", error);
    return { success: false, error: "Failed to delete store item" };
  }
}

// Purchase a store item (Student only)
export async function purchaseStoreItem(
  itemId: string,
  // studentId is derived from session
  quantity: number
): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return { success: false, error: "Unauthorized: Only students can purchase items" };
    }

    // Find the student record associated with the user
    const student = await db.student.findUnique({
      where: { id: session.user.id },
      include: { bankAccounts: true }
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    if (quantity <= 0) {
      return { success: false, error: "Quantity must be positive" };
    }

    const existingClassIds = originalItem.class.map((cls) => cls.id);
    const newClassIds = targetClassIds.filter((id) => !existingClassIds.includes(id));

    if (!checkingAccount || checkingAccount.balance < totalPrice) {
      return { success: false, error: "Insufficient funds" };
    }

    // Use transaction for purchase logic
    const result = await db.$transaction(async (tx) => {
      // Get item details and lock the row for update
      const item = await tx.storeItem.findUnique({
        where: { id: itemId },
      });

      if (!item) throw new Error("Item not found");
      if (!item.isAvailable) throw new Error("Item is not available for purchase");
      if (item.quantity < quantity) throw new Error("Insufficient stock available");

      const totalPrice = item.price * quantity;

      // Update the bank account balance instead
      await tx.bankAccount.update({
        where: { id: checkingAccount.id },
        data: { balance: { decrement: totalPrice } }
      });

      // Decrement item quantity
      const updatedItem = await tx.storeItem.update({
        where: { id: itemId },
        data: { quantity: { decrement: quantity } }
      });

      // Create purchase record
      const purchase = await tx.studentPurchase.create({
        data: {
          studentId: student.id,
          itemId: itemId, // Changed from storeItemId to itemId
          quantity: quantity,
          totalPrice: totalPrice, // Changed from price to amount, assuming this is the correct field name
          status: "PAID", // Changed from COMPLETED to PAID if that's what your enum allows
        }
      });

      return { purchase, updatedItem };
    });

    // Revalidate relevant paths (e.g., student balance display, store item list)
    // Need class code for revalidation
    const itemClass = await db.storeItem.findUnique({ where: { id: itemId }, select: { class: { select: { code: true } } } });
    if (itemClass && itemClass.class[0]) {
      revalidatePath(`/dashboard/classes/${itemClass.class[0].code}/store`);
      // Revalidate student-specific pages if applicable
    }

    return { success: true, data: result.purchase };

  } catch (error: any) {
    console.error("Purchase store item error:", error);
    // Check for specific transaction errors (e.g., insufficient balance/stock)
    if (error.message === "Insufficient balance" || error.message === "Insufficient stock available" || error.message === "Item not found" || error.message === "Item is not available for purchase") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to purchase item" };
  }
}

// Delete Store Item (only teacher who owns the class can delete)
export async function deleteStoreItem(storeItemId: string): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verificar que el item pertenece a una clase de este profesor
    const storeItem = await db.storeItem.findFirst({
      where: {
        id: storeItemId,
        class: {
          some: {
            userId: session.user.id
          }
        }
      }
    });

    if (!storeItem) {
      return { success: false, error: "Store item not found or you don't have permission to delete it" };
    }

    // Eliminar el item si pertenece a una clase del profesor
    await db.storeItem.delete({
      where: { id: storeItemId },
    });

    revalidatePath("/dashboard/storefront");
    revalidatePath("/dashboard/classes");
    return { success: true, message: "Store item deleted successfully" };
  } catch (error) {
    console.error("Error deleting store item:", error);
    return { success: false, error: "Failed to delete store item" };
  }
}

// Update an existing store item
export async function updateStoreItem(
  storeItemId: string,
  data: UpdateStoreItemData
): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify that the store item exists and belongs to one of the teacher's classes
    const existingItem = await db.storeItem.findFirst({
      where: {
        id: storeItemId,
        class: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!existingItem) {
      return { success: false, error: "Store item not found or you don't have permission to update it" };
    }

    // Update the store item with the provided data
    const updatedItem = await db.storeItem.update({
      where: { id: storeItemId },
      data: {
        name: data.name,
        emoji: data.emoji,
        price: data.price,
        description: data.description,
        quantity: data.quantity,
        isAvailable: data.isAvailable,
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
        purchases: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              }
            }
          },
        },
      },
    });

    // Revalidate the relevant paths to update the UI
    revalidatePath("/teacher/dashboard/storefront");
    revalidatePath(`/teacher/dashboard/storefront/${storeItemId}`);
    
    // If this item is associated with classes, revalidate those paths too
    if (updatedItem.class && updatedItem.class.length > 0) {
      updatedItem.class.forEach(cls => {
        revalidatePath(`/teacher/dashboard/classes/${cls.code}`);
      });
    }

    return { 
      success: true, 
      message: "Store item updated successfully",
      data: updatedItem 
    };
  } catch (error) {
    console.error("Error updating store item:", error);
    return { success: false, error: "Failed to update store item" };
  }
}

// Get store items available to a student
export async function getStudentStoreItems(): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authorized" };
    }

    // Get the student profile
    const student = await db.student.findUnique({
      where: { userId: session.user.id },
    });

    if (!student) {
      return { success: false, error: "Student profile not found" };
    }

    // Get the classes the student is enrolled in
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId: student.id,
        enrolled: true
      },
      select: {
        classId: true
      }
    });

    const classIds = enrollments.map(enrollment => enrollment.classId);

    if (classIds.length === 0) {
      // Student isn't enrolled in any classes
      return { success: true, data: [] };
    }

    // Get available store items from those classes
    const storeItems = await db.storeItem.findMany({
      where: {
        isAvailable: true,
        quantity: { gt: 0 },
        class: {
          some: {
            id: { in: classIds }
          }
        }
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            emoji: true
          }
        }
      }
    });

    return { success: true, data: storeItems };
  } catch (error) {
    console.error("Error fetching student store items:", error);
    return { success: false, error: "Failed to fetch store items" };
  }
}
