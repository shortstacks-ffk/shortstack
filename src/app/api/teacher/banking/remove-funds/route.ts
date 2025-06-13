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

            // Check if there's sufficient funds
            if (account.balance < amount) {
              return { 
                studentId, 
                success: false, 
                error: "Insufficient funds" 
              };
            }

            // For today's transactions, create a calendar event instead of processing immediately
            await db.calendarEvent.create({
              data: {
                title: `Remove $${amount} from ${accountType} account`,
                description: description || `Scheduled funds removal by teacher`,
                startDate: issueDateTime,
                endDate: issueDateTime,
                variant: "destructive",
                isRecurring: false,
                recurringDays: [],
                recurrenceType: "NONE",
                recurrenceInterval: 0,
                monthlyDate: null,
                metadata: {
                  transactionType: "REMOVE_FUNDS",
                  studentId,
                  accountType,
                  amount,
                  scheduledTransaction: true,
                  processOnDate: true // Flag to indicate this should be processed on the specified date
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
      // Also modify recurring transactions to not process immediately
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

          // First occurrence is always the issue date itself
          let nextOccurrence = new Date(issueDateTime);
          
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
                originalIssueDate: issueDate,
                processOnDate: true // Flag to indicate this should be processed on the specified date
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

      const message = `Successfully scheduled ${recurrence} withdrawals for ${results.length} accounts starting ${issueDateTime.toLocaleDateString()}`;

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