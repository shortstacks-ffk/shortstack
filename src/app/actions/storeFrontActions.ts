"use server";

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/src/lib/auth";

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

interface RemoveStoreItemFromClassesParams {
  storeItemId: string;
  classIds: string[];
}

// Create a new store item
export async function createStoreItem(
  formData: FormData
): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Get the teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, error: "Teacher profile not found" };
    }

    const data: CreateStoreItemData = {
      name: formData.get("name") as string,
      emoji: (formData.get("emoji") as string) || "🛍️",
      price: parseFloat(formData.get("price") as string),
      description: formData.get("description") as string,
      quantity: parseInt(formData.get("quantity") as string, 10) || 0,
      isAvailable: formData.get("isAvailable") === "true",
    };

    // Validate required fields
    if (!data.name || isNaN(data.price)) {
      return { success: false, error: "Missing required fields" };
    }

    // Create item data object with teacherId
    const itemData: any = {
      ...data,
      teacherId: teacher.id, // Use teacherId instead of userId
    };

    // Handle optional class connections
    const classIds = formData.getAll("classIds") as string[];
    if (classIds.length > 0) {
      // Verify that all classes belong to this teacher
      const classes = await db.class.findMany({
        where: {
          id: { in: classIds },
          teacherId: teacher.id,
        },
      });

      if (classes.length !== classIds.length) {
        return { success: false, error: "One or more selected classes are invalid" };
      }

      // Add class connections to the item data
      itemData.classes = {
        connect: classIds.map((id) => ({ id })),
      };
    }

    // Create the store item
    const newItem = await db.storeItem.create({
      data: itemData,
      include: {
        classes: {
          select: {
            id: true,
            name: true,
            emoji: true,
            code: true,
          },
        },
      },
    });

    revalidatePath("/teacher/dashboard/storefront");
    return { success: true, data: newItem };
  } catch (error) {
    console.error("Create store item error:", error);
    return { success: false, error: "Failed to create store item" };
  }
}

// Get all store items for the current teacher
export async function getAllStoreItems(filters?: {
  classId?: string;
  includeUnassigned?: boolean;
}): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authorized" };
    }

    // Get the teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, error: "Teacher profile not found" };
    }

    // Build the query based on filters
    let whereCondition: any = {};

    if (filters?.classId) {
      // Filter items for a specific class
      whereCondition = {
        AND: [
          { teacherId: teacher.id },
          {
            classes: {
              some: {
                id: filters.classId,
              },
            },
          },
        ],
      };
    } else {
      // Always include items created by this teacher
      whereCondition = {
        teacherId: teacher.id,
      };

      // If not including unassigned items, add class filter
      if (!filters?.includeUnassigned) {
        whereCondition.classes = {
          some: {},
        };
      }
    }

    // Query the database
    const items = await db.storeItem.findMany({
      where: whereCondition,
      include: {
        classes: {
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

// Get a single store item with details
export async function getStoreItem(storeItemId: string): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authorized" };
    }

    // Get the teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, error: "Teacher profile not found" };
    }

    // Get the store item with all related data
    const item = await db.storeItem.findFirst({
      where: {
        id: storeItemId,
        teacherId: teacher.id,
      },
      include: {
        classes: {
          select: {
            id: true,
            name: true,
            code: true,
            emoji: true,
          },
        },
        purchases: {
          select: {
            id: true,
            quantity: true,
            totalPrice: true,
            status: true,
            purchasedAt: true,
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
          orderBy: {
            purchasedAt: "desc",
          },
        },
      },
    });

    if (!item) {
      return { success: false, error: "Store item not found or you don't have permission to view it" };
    }

    return { success: true, data: item };
  } catch (error) {
    console.error("Get store item error:", error);
    return { success: false, error: "Failed to fetch store item" };
  }
}

// Copy/assign a store item to additional classes
export async function copyStoreItemToClasses({
  storeItemId,
  targetClassIds,
}: CopyStoreItemToClassParams): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Get the teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, error: "Teacher profile not found" };
    }

    // 1. Verify the store item exists and belongs to this teacher
    const originalItem = await db.storeItem.findFirst({
      where: {
        id: storeItemId,
        teacherId: teacher.id,
      },
      include: {
        classes: true,
      },
    });

    if (!originalItem) {
      return { success: false, error: "Store item not found or doesn't belong to you" };
    }

    // 2. Verify all target classes belong to this teacher
    const targetClasses = await db.class.findMany({
      where: {
        id: { in: targetClassIds },
        teacherId: teacher.id,
      },
    });

    if (targetClasses.length !== targetClassIds.length) {
      return { success: false, error: "One or more target classes are invalid" };
    }

    // 3. Check which classes the item is already assigned to
    const existingClassIds = originalItem.classes.map((cls) => cls.id);

    // Filter out classes that already have this item
    const newClassIds = targetClassIds.filter((id) => !existingClassIds.includes(id));

    if (newClassIds.length === 0) {
      return { success: false, error: "Store item is already assigned to all selected classes" };
    }

    // 4. Update the store item to add the new class connections
    const updatedItem = await db.storeItem.update({
      where: { id: storeItemId },
      data: {
        classes: {
          connect: newClassIds.map((id) => ({ id })),
        },
      },
      include: {
        classes: true,
      },
    });

    // Revalidate paths
    revalidatePath("/teacher/dashboard/storefront");
    targetClasses.forEach((cls) => {
      revalidatePath(`/teacher/dashboard/classes/${cls.code}/store`);
    });

    return {
      success: true,
      data: updatedItem,
      message: `Store item assigned to ${newClassIds.length} additional class(es)`,
    };
  } catch (error) {
    console.error("Error copying store item to classes:", error);
    return { success: false, error: "Failed to assign store item to classes" };
  }
}

// Remove store item from specific classes (or all)
export async function removeStoreItemFromClasses({
  storeItemId,
  classIds,
}: RemoveStoreItemFromClassesParams): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Get the teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, error: "Teacher profile not found" };
    }

    // Verify the store item belongs to this teacher
    const item = await db.storeItem.findFirst({
      where: {
        id: storeItemId,
        teacherId: teacher.id,
      },
      include: {
        classes: true,
      },
    });

    if (!item) {
      return { success: false, error: "Store item not found or doesn't belong to you" };
    }

    // If empty classIds array, disconnect from all classes
    if (classIds.length === 0) {
      // Get all classes currently associated with this item
      const currentClassIds = item.classes.map((c) => ({ id: c.id }));

      // Update the item to disconnect from all classes
      await db.storeItem.update({
        where: { id: storeItemId },
        data: {
          classes: {
            disconnect: currentClassIds,
          },
        },
      });

      revalidatePath("/teacher/dashboard/storefront");
      item.classes.forEach((cls) => {
        revalidatePath(`/teacher/dashboard/classes/${cls.code}/store`);
      });

      return {
        success: true,
        message: "Store item unassigned from all classes but still available in your account",
      };
    } else {
      // Remove item from specific classes

      // Verify all classIds are valid
      const validClassIds = item.classes
        .filter((c) => classIds.includes(c.id))
        .map((c) => ({ id: c.id }));

      if (validClassIds.length !== classIds.length) {
        return { success: false, error: "One or more classes are not assigned this store item" };
      }

      // Update item to disconnect from specified classes
      await db.storeItem.update({
        where: { id: storeItemId },
        data: {
          classes: {
            disconnect: validClassIds,
          },
        },
      });

      revalidatePath("/teacher/dashboard/storefront");
      validClassIds.forEach((cls) => {
        // Get the class code for path revalidation
        const classCode = item.classes.find((c) => c.id === cls.id)?.code;
        if (classCode) {
          revalidatePath(`/teacher/dashboard/classes/${classCode}/store`);
        }
      });

      return {
        success: true,
        message: `Store item unassigned from ${validClassIds.length} class(es)`,
      };
    }
  } catch (error) {
    console.error("Error removing store item from classes:", error);
    return { success: false, error: "Failed to unassign store item from classes" };
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
    const student = await db.student.findFirst({
      where: { userId: session.user.id },
    });

    if (!student) {
      return { success: false, error: "Student profile not found" };
    }

    // Get the classes the student is enrolled in
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId: student.id,
        enrolled: true,
      },
      select: { classId: true },
    });

    const classIds = enrollments.map((e) => e.classId);

    if (classIds.length === 0) {
      return { success: true, data: [] };
    }

    // Get available store items from those classes
    const storeItems = await db.storeItem.findMany({
      where: {
        isAvailable: true,
        quantity: { gt: 0 },
        classes: {
          some: {
            id: { in: classIds },
          },
        },
      },
      include: {
        classes: {
          select: {
            id: true,
            name: true,
            emoji: true,
          },
        },
      },
    });

    return { success: true, data: storeItems };
  } catch (error) {
    console.error("Error fetching student store items:", error);
    return { success: false, error: "Failed to fetch store items" };
  }
}

// Student purchases a store item
export async function purchaseStoreItem(itemId: string, quantity: number): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authorized" };
    }

    // Get the student profile
    const student = await db.student.findFirst({
      where: { userId: session.user.id },
    });

    if (!student) {
      return { success: false, error: "Student profile not found" };
    }

    // Verify the item exists and is available
    const storeItem = await db.storeItem.findUnique({
      where: { id: itemId },
    });

    if (!storeItem) {
      return { success: false, error: "Item not found" };
    }

    if (!storeItem.isAvailable) {
      return { success: false, error: "This item is not available for purchase" };
    }

    if (storeItem.quantity < quantity) {
      return { success: false, error: "Not enough items in stock" };
    }

    // Calculate total price
    const totalPrice = storeItem.price * quantity;

    // Create the purchase record
    const purchase = await db.studentPurchase.create({
      data: {
        itemId: storeItem.id,
        studentId: student.id,
        quantity,
        totalPrice,
        status: "PENDING",
      },
    });

    // Update the item quantity
    await db.storeItem.update({
      where: { id: itemId },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });

    revalidatePath("/student/dashboard/storefront");
    revalidatePath("/teacher/dashboard/storefront");

    return {
      success: true,
      message: "Item purchased successfully",
      data: purchase,
    };
  } catch (error) {
    console.error("Error purchasing store item:", error);
    return { success: false, error: "Failed to purchase item" };
  }
}

// Delete Store Item (only creator can delete)
export async function deleteStoreItem(storeItemId: string): Promise<StoreItemResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Get the teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, error: "Teacher profile not found" };
    }

    // Verify the store item belongs to this teacher
    const item = await db.storeItem.findFirst({
      where: {
        id: storeItemId,
        teacherId: teacher.id,
      },
      include: {
        classes: {
          select: { code: true },
        },
      },
    });

    if (!item) {
      return { success: false, error: "Store item not found or you don't have permission to delete it" };
    }

    // Delete associated purchases first
    await db.studentPurchase.deleteMany({
      where: { itemId: storeItemId },
    });

    // Delete the store item
    await db.storeItem.delete({
      where: { id: storeItemId },
    });

    // Revalidate paths
    revalidatePath("/teacher/dashboard/storefront");
    item.classes.forEach((cls) => {
      revalidatePath(`/teacher/dashboard/classes/${cls.code}/store`);
    });

    return { success: true };
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

    // Get the teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, error: "Teacher profile not found" };
    }

    // Verify the store item belongs to this teacher
    const item = await db.storeItem.findFirst({
      where: {
        id: storeItemId,
        teacherId: teacher.id,
      },
    });

    if (!item) {
      return { success: false, error: "Store item not found or you don't have permission to update it" };
    }

    // Update the store item
    const updatedItem = await db.storeItem.update({
      where: { id: storeItemId },
      data,
      include: {
        classes: {
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
    });

    // Revalidate paths
    revalidatePath("/teacher/dashboard/storefront");
    updatedItem.classes.forEach((cls) => {
      revalidatePath(`/teacher/dashboard/classes/${cls.code}/store`);
    });

    return { success: true, data: updatedItem };
  } catch (error) {
    console.error("Update store item error:", error);
    return { success: false, error: "Failed to update store item" };
  }
}