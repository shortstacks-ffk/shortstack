import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      studentIds, 
      accountType, 
      amount, 
      description,
      issueDate = new Date().toISOString(),
      recurrence = "once"
    } = await request.json();
    
    if (!studentIds || !studentIds.length || !accountType || !amount || amount <= 0) {
      return NextResponse.json({ 
        error: "Missing required fields or invalid amount" 
      }, { status: 400 });
    }

    // For one-time transactions, just process them now
    if (recurrence === "once") {
      // Process each student in parallel
      const results = await Promise.all(
        studentIds.map(async (studentId: string) => {
          // Find the student's account
          const account = await db.bankAccount.findFirst({
            where: {
              studentId,
              accountType: accountType.toUpperCase(),
            },
          });

          if (!account) {
            return { 
              studentId,
              success: false,
              error: `Account not found for student`
            };
          }

          // Add funds to the account and create transaction record
          await db.$transaction([
            // Update account balance
            db.bankAccount.update({
              where: { id: account.id },
              data: { balance: { increment: amount } },
            }),
            
            // Create transaction record
            db.transaction.create({
              data: {
                accountId: account.id,
                amount,
                description: description || "Funds added by teacher",
                transactionType: "DEPOSIT",
              },
            }),
          ]);

          return { studentId, success: true };
        })
      );

      // Check if any operations failed
      const failures = results.filter(r => !r.success);
      
      if (failures.length) {
        return NextResponse.json({ 
          warning: "Some operations failed",
          failures,
          successes: results.filter(r => r.success).length
        }, { status: 207 }); // 207 Multi-Status
      }

      return NextResponse.json({ 
        success: true, 
        message: `Successfully added funds to ${results.length} accounts`
      });
    } 
    // For recurring transactions, we'll schedule them
    else {
      // Create calendar events for recurring transactions
      const results = await Promise.all(
        studentIds.map(async (studentId: string) => {
          // Find the student's account
          const account = await db.bankAccount.findFirst({
            where: {
              studentId,
              accountType: accountType.toUpperCase(),
            },
          });

          if (!account) {
            return { 
              studentId,
              success: false,
              error: `Account not found for student`
            };
          }

          // Process the first transaction immediately
          await db.$transaction([
            // Update account balance
            db.bankAccount.update({
              where: { id: account.id },
              data: { balance: { increment: amount } },
            }),
            
            // Create transaction record
            db.transaction.create({
              data: {
                accountId: account.id,
                amount,
                description: description || `Recurring ${recurrence} funds added by teacher`,
                transactionType: "DEPOSIT",
              },
            }),
          ]);

          // Create a calendar event for the recurring transaction
          let recurrenceType;
          let recurrenceInterval = 1;

          switch (recurrence) {
            case "weekly":
              recurrenceType = "WEEKLY";
              recurrenceInterval = 1;
              break;
            case "biweekly":
              recurrenceType = "WEEKLY";
              recurrenceInterval = 2;
              break;
            case "monthly":
              recurrenceType = "MONTHLY";
              recurrenceInterval = 1;
              break;
            default:
              recurrenceType = "NONE";
          }

          // Only create calendar event for recurring transactions
          if (recurrenceType !== "NONE") {
            const parsedDate = new Date(issueDate);
            const monthlyDate = parsedDate.getDate(); 

            await db.calendarEvent.create({
              data: {
                title: `Add ${amount} to ${accountType} account`,
                description: description || `Recurring ${recurrence} funds added by teacher`,
                startDate: parsedDate,
                endDate: parsedDate,
                variant: "success",
                isRecurring: true,
                recurringDays: [parsedDate.getDay()],
                recurrenceType,
                recurrenceInterval,
                monthlyDate: recurrenceType === "MONTHLY" ? monthlyDate : null,
                metadata: {
                  transactionType: "ADD_FUNDS",
                  studentId,
                  accountType,
                  amount,
                },
                createdById: session.user.id,
                studentId,
              }
            });
          }

          return { studentId, success: true };
        })
      );

      // Check if any operations failed
      const failures = results.filter(r => !r.success);
      
      if (failures.length) {
        return NextResponse.json({ 
          warning: "Some operations failed",
          failures,
          successes: results.filter(r => r.success).length
        }, { status: 207 }); // 207 Multi-Status
      }

      return NextResponse.json({ 
        success: true, 
        message: `Successfully scheduled ${recurrence} funds to ${results.length} accounts`
      });
    }
  } catch (error) {
    console.error("Error adding funds:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}