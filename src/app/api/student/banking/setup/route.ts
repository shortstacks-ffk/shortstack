import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the student record
    const student = await db.student.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
        ]
      },
      include: {
        bankAccounts: true
      }
    });
    
    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }
    
    const accounts = [];
    
    // Check if checking account already exists
    const existingChecking = student.bankAccounts.find(acc => acc.accountType === "CHECKING");
    
    if (!existingChecking) {
      // Create checking account if it doesn't exist
      const checkingAccount = await db.bankAccount.create({
        data: {
          studentId: student.id,
          accountType: "CHECKING",
          accountNumber: generateAccountNumber(),
          balance: 0, // Starting balance
        }
      });
      accounts.push(checkingAccount);
    } else {
      accounts.push(existingChecking);
    }
    
    // Check if savings account already exists
    const existingSavings = student.bankAccounts.find(acc => acc.accountType === "SAVINGS");
    
    if (!existingSavings) {
      // Create savings account if it doesn't exist
      const savingsAccount = await db.bankAccount.create({
        data: {
          studentId: student.id,
          accountType: "SAVINGS",
          accountNumber: generateAccountNumber(),
          balance: 0, // Starting balance
        }
      });
      accounts.push(savingsAccount);
    } else {
      accounts.push(existingSavings);
    }
    
    // Format accounts for response
    const formattedAccounts = accounts.map(account => ({
      ...account,
      displayAccountNumber: account.accountType === "CHECKING" ? 
        `CH${account.accountNumber}` : `SV${account.accountNumber}`
    }));
    
    return NextResponse.json(formattedAccounts);
    
  } catch (error) {
    console.error("Error setting up accounts:", error);
    return NextResponse.json({ error: "Failed to set up accounts" }, { status: 500 });
  }
}

// Helper to generate random account number
function generateAccountNumber() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}