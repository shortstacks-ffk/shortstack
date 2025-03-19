"use server";

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

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
}

// Create a new store item
export async function createStoreItem(formData: FormData): Promise<StoreItemResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Not authorized" };
    }

    const data: CreateStoreItemData = {
      name: formData.get("name") as string,
      emoji: formData.get("emoji") as string || "🛍️",
      price: parseFloat(formData.get("price") as string),
      description: formData.get("description") as string,
      quantity: parseInt(formData.get("quantity") as string, 10),
      isAvailable: formData.get("isAvailable") === "true",
    };

    // Validate required fields
    if (!data.name || !data.price) {
      return { success: false, error: "Missing required fields" };
    }

    const newItem = await db.storeItem.create({
      data
    });

    revalidatePath("/dashboard/storefront");
    return { success: true, data: newItem };
  } catch (error) {
    console.error("Create store item error:", error);
    return { success: false, error: "Failed to create store item" };
  }
}

// Get all store items for a class
export async function getStoreItems(classId?: string): Promise<StoreItemResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Not authorized" };
    }

    // If classId is provided, filter by class, otherwise get all items
    const items = await db.storeItem.findMany({
      where: classId ? { classId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        class: {
          select: {
            name: true,
            code: true,
            emoji: true
          }
        }
      }
    });

    return { success: true, data: items };
  } catch (error) {
    console.error("Get store items error:", error);
    return { success: false, error: "Failed to fetch store items" };
  }
}

// Assign class to store item
export async function assignClassToStoreItem(
  itemId: string,
  classId: string
): Promise<StoreItemResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Not authorized" };
    }

    const updatedItem = await db.storeItem.update({
      where: { id: itemId },
      data: { classId }
    });

    revalidatePath("/dashboard/storefront");
    return { success: true, data: updatedItem };
  } catch (error) {
    console.error("Assign class error:", error);
    return { success: false, error: "Failed to assign class to store item" };
  }
}

// Update a store item
export async function updateStoreItem(
  id: string,
  data: UpdateStoreItemData
): Promise<StoreItemResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Not authorized" };
    }

    const updatedItem = await db.storeItem.update({
      where: { id },
      data
    });

    revalidatePath("/dashboard/storefront");
    return { success: true, data: updatedItem };
  } catch (error) {
    console.error("Update store item error:", error);
    return { success: false, error: "Failed to update store item" };
  }
}

// Delete a store item
export async function deleteStoreItem(id: string): Promise<StoreItemResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Not authorized" };
    }

    await db.storeItem.delete({
      where: { id }
    });

    revalidatePath("/dashboard/storefront");
    return { success: true };
  } catch (error) {
    console.error("Delete store item error:", error);
    return { success: false, error: "Failed to delete store item" };
  }
}

// Purchase a store item
export async function purchaseStoreItem(
  itemId: string,
  studentId: string,
  quantity: number
): Promise<StoreItemResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Not authorized" };
    }

    const item = await db.storeItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return { success: false, error: "Item not found" };
    }

    if (!item.isAvailable) {
      return { success: false, error: "Item is not available" };
    }

    if (item.quantity < quantity) {
      return { success: false, error: "Insufficient quantity available" };
    }

    // Create purchase record and update item quantity in a transaction
    const [purchase] = await db.$transaction([
      db.studentPurchase.create({
        data: {
          itemId,
          studentId,
          quantity,
          totalPrice: item.price * quantity,
          status: 'PENDING'
        }
      }),
      db.storeItem.update({
        where: { id: itemId },
        data: {
          quantity: item.quantity - quantity
        }
      })
    ]);

    revalidatePath("/dashboard/storefront");
    return { success: true, data: purchase };
  } catch (error) {
    console.error("Purchase store item error:", error);
    return { success: false, error: "Failed to process purchase" };
  }
}