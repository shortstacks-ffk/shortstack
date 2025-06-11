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

    // Get teacher record first
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    const { 
      studentIds, 
      accountType, 
      amount, 
      description,
      issueDate = new Date().toISOString(),
      recurrence = "once",
      timezone // Get timezone from client
    } = await request.json();
    
    if (!studentIds || !studentIds.length || !accountType || !amount || amount <= 0) {
      return NextResponse.json({ 
        error: "Missing required fields or invalid amount" 
      }, { status: 400 });
    }

    // Verify teacher has access to all students through enrollment
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId: { in: studentIds },
        class: {
          teacherId: teacher.id
        },
        enrolled: true
      },
      select: { studentId: true }
    });

    const accessibleStudentIds = enrollments.map(e => e.studentId);
    const unauthorizedStudentIds = studentIds.filter((id: string) => !accessibleStudentIds.includes(id));

    if (unauthorizedStudentIds.length > 0) {
      return NextResponse.json({ 
        error: "Unauthorized access to some students",
        unauthorizedStudentIds
      }, { status: 403 });
    }

    // Parse the issue date properly with timezone consideration
    const issueDateTime = new Date(issueDate);
    const today = new Date();
    
    // Check if the issue date is today (in user's timezone)
    const isToday = issueDateTime.toDateString() === today.toDateString();

    // For one-time transactions
    if (recurrence === "once") {
      // If issue date is today, process immediately
      // If issue date is in the future, just create calendar events (no immediate transaction)
      
      if (isToday) {
        // Process transactions immediately
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
                error: "Account not found" 
              };
            }

            if (account.balance < amount) {
              return { 
                studentId, 
                success: false, 
                error: "Insufficient funds" 
              };
            }

            // Remove funds from the account and create transaction record
            await db.$transaction([
              // Update account balance
              db.bankAccount.update({
                where: { id: account.id },
                data: { balance: { decrement: amount } },
              }),
              
              // Create transaction record
              db.transaction.create({
                data: {
                  accountId: account.id,
                  amount,
                  description: description || "Funds removed by teacher",
                  transactionType: "WITHDRAWAL",
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
          }, { status: 207 });
        }

        return NextResponse.json({ 
          success: true, 
          message: `Successfully removed funds from ${results.length} accounts`
        });
      } else {
        // Create calendar events for future one-time transactions
        const results = await Promise.all(
          studentIds.map(async (studentId: string) => {
            // Find the student's account to verify it exists
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

            // Create calendar event for the future transaction
            await db.calendarEvent.create({
              data: {
                title: `Remove $${amount} from ${accountType} account`,
                description: description || `Scheduled funds removal by teacher`,
                startDate: issueDateTime,
                endDate: issueDateTime,
                variant: "destructive",
                isRecurring: false, // One-time future transaction
                recurringDays: [],
                recurrenceType: "NONE",
                recurrenceInterval: 0,
                monthlyDate: null,
                metadata: {
                  transactionType: "REMOVE_FUNDS",
                  studentId,
                  accountType,
                  amount,
                  scheduledTransaction: true // Flag to indicate this is a scheduled transaction
                },
                createdById: teacher.id,
                studentId,
              }
            });

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
          }, { status: 207 });
        }

        return NextResponse.json({ 
          success: true, 
          message: `Successfully scheduled funds removal for ${results.length} accounts on ${issueDateTime.toLocaleDateString()}`
        });
      }
    } 
    // For recurring transactions
    else {
      // For recurring transactions, we only process the first transaction if it's today
      // Then create the recurring calendar event starting from the next occurrence
      
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

          // If issue date is today, process the first transaction immediately
          if (isToday) {
            if (account.balance < amount) {
              return { 
                studentId, 
                success: false, 
                error: "Insufficient funds" 
              };
            }

            await db.$transaction([
              // Update account balance
              db.bankAccount.update({
                where: { id: account.id },
                data: { balance: { decrement: amount } },
              }),
              
              // Create transaction record
              db.transaction.create({
                data: {
                  accountId: account.id,
                  amount,
                  description: description || `Recurring ${recurrence} funds removed by teacher`,
                  transactionType: "WITHDRAWAL",
                },
              }),
            ]);
          }

          // Create a calendar event for the recurring transaction
          let recurrenceType;
          let recurrenceInterval = 1;
          let recurringDays: number[] = [];

          switch (recurrence) {
            case "weekly":
              recurrenceType = "WEEKLY";
              recurrenceInterval = 1;
              recurringDays = [issueDateTime.getDay()]; // Day of the week (0-6)
              break;
            case "biweekly":
              recurrenceType = "WEEKLY";
              recurrenceInterval = 2;
              recurringDays = [issueDateTime.getDay()];
              break;
            case "monthly":
              recurrenceType = "MONTHLY";
              recurrenceInterval = 1;
              recurringDays = [];
              break;
            default:
              recurrenceType = "NONE";
          }

          // Calculate the next occurrence date
          let nextOccurrence = new Date(issueDateTime);
          
          if (isToday) {
            // If we processed today, set next occurrence based on recurrence
            switch (recurrence) {
              case "weekly":
                nextOccurrence.setDate(nextOccurrence.getDate() + 7);
                break;
              case "biweekly":
                nextOccurrence.setDate(nextOccurrence.getDate() + 14);
                break;
              case "monthly":
                nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
                break;
            }
          }
          // If issue date is in the future, the first occurrence is the issue date itself

          const monthlyDate = recurrenceType === "MONTHLY" ? issueDateTime.getDate() : null;

          await db.calendarEvent.create({
            data: {
              title: `Remove $${amount} from ${accountType} account`,
              description: description || `Recurring ${recurrence} funds removed by teacher`,
              startDate: nextOccurrence,
              endDate: nextOccurrence,
              variant: "destructive",
              isRecurring: true,
              recurringDays,
              recurrenceType,
              recurrenceInterval,
              monthlyDate,
              metadata: {
                transactionType: "REMOVE_FUNDS",
                studentId,
                accountType,
                amount,
                timezone: timezone || 'UTC',
                originalIssueDate: issueDate
              },
              createdById: teacher.id,
              studentId,
            }
          });

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
        }, { status: 207 });
      }

      const message = isToday 
        ? `Successfully processed first transaction and scheduled ${recurrence} withdrawals for ${results.length} accounts`
        : `Successfully scheduled ${recurrence} withdrawals for ${results.length} accounts starting ${issueDateTime.toLocaleDateString()}`;

      return NextResponse.json({ 
        success: true, 
        message
      });
    }
  } catch (error) {
    console.error("Error removing funds:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}