import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { itemId, quantity, accountId } = await request.json();

    if (!itemId || !quantity || !accountId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the student profile
    const student = await db.student.findFirst({
      where: { userId: session.user.id },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }

    // Verify the account belongs to the student
    const account = await db.bankAccount.findFirst({
      where: {
        id: accountId,
        studentId: student.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Bank account not found or doesn't belong to you" },
        { status: 404 }
      );
    }

    // Get the store item
    const storeItem = await db.storeItem.findUnique({
      where: { id: itemId },
    });

    if (!storeItem) {
      return NextResponse.json(
        { error: "Store item not found" },
        { status: 404 }
      );
    }

    if (!storeItem.isAvailable) {
      return NextResponse.json(
        { error: "This item is not available for purchase" },
        { status: 400 }
      );
    }

    if (storeItem.quantity < quantity) {
      return NextResponse.json(
        { error: "Not enough items in stock" },
        { status: 400 }
      );
    }

    // Calculate total cost
    const totalCost = storeItem.price * quantity;

    // Check if account has sufficient funds
    if (account.balance < totalCost) {
      return NextResponse.json(
        {
          error: "Insufficient balance to purchase this item",
          details: {
            currentBalance: account.balance,
            needed: totalCost - account.balance,
          },
        },
        { status: 400 }
      );
    }

    // Use a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // 1. Check if a purchase already exists
      const existingPurchase = await tx.studentPurchase.findFirst({
        where: {
          itemId: storeItem.id,
          studentId: student.id,
        },
      });

      let purchase;
      if (existingPurchase) {
        // Update existing purchase
        purchase = await tx.studentPurchase.update({
          where: { id: existingPurchase.id },
          data: {
            quantity: existingPurchase.quantity + quantity,
            totalPrice: existingPurchase.totalPrice + totalCost,
          },
        });
      } else {
        // Create new purchase record
        purchase = await tx.studentPurchase.create({
          data: {
            itemId: storeItem.id,
            studentId: student.id,
            quantity,
            totalPrice: totalCost,
            status: "PAID",
          },
        });
      }

      // 2. Update the item quantity
      await tx.storeItem.update({
        where: { id: itemId },
        data: {
          quantity: {
            decrement: quantity,
          },
        },
      });

      // 3. Deduct money from the specific account
      const updatedAccount = await tx.bankAccount.update({
        where: { id: accountId },
        data: {
          balance: {
            decrement: totalCost,
          },
        },
      });

      // 4. Create a transaction record
      await tx.transaction.create({
        data: {
          amount: -totalCost,
          description: `Purchased ${quantity}x ${storeItem.name}`,
          transactionType: "WITHDRAWAL", // Make sure this matches your TransactionType enum
          accountId: accountId,
        },
      });

      return {
        purchase,
        newBalance: updatedAccount.balance,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Item purchased successfully",
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error("Error purchasing store item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
