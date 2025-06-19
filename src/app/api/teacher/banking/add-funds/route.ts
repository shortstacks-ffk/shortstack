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
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    const {
      studentIds = [],
      accountType,
      amount,
      description = "Funds added by teacher",
      issueDate,
      recurrence = "once"
    } = await request.json();

    if (!studentIds.length || !accountType || !amount || amount <= 0 || !issueDate) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    // For each student: update balance, record transaction
    const results = await Promise.all(
      studentIds.map(async (studentId: string) => {
        // verify enrollment
        const ok = await db.enrollment.findFirst({
          where: {
            studentId,
            class: { is: { teacherId: teacher.id } }
          }
        });
        if (!ok) return { studentId, success: false, error: "Not enrolled" };

        const acct = await db.bankAccount.findFirst({
          where: { studentId, accountType: accountType.toUpperCase() }
        });
        if (!acct) return { studentId, success: false, error: "Account not found" };

        const selected = new Date(issueDate);
        selected.setHours(0, 0, 0, 0);

        // FUTURE: just schedule
        if (selected > todayDate) {
          await db.calendarEvent.create({
            data: {
              title: `Add $${amount}`,
              description,
              startDate: new Date(issueDate),
              endDate: new Date(issueDate),
              variant: "success",
              isRecurring: recurrence !== "once",
              recurringDays: recurrence === "weekly" || recurrence === "biweekly"
                ? [new Date(issueDate).getDay()]
                : [],
              recurrenceType: recurrence.toUpperCase(),
              recurrenceInterval: recurrence === "biweekly" ? 2 : 1,
              monthlyDate: recurrence === "monthly" ? selected.getDate() : null,
              metadata: {
                transactionType: "ADD_FUNDS",
                studentId,
                accountType,
                amount
              },
              createdById: teacher.id,
              studentId
            }
          });
          return { studentId, success: true, scheduled: true };
        }

        // TODAY or PAST (should never be past due guard above): execute now
        await db.$transaction([
          db.bankAccount.update({
            where: { id: acct.id },
            data: { balance: { increment: amount } }
          }),
          db.transaction.create({
            data: {
              accountId: acct.id,
              amount,
              description,
              createdAt: new Date(issueDate),
              transactionType: "DEPOSIT"
            }
          })
        ]);

        // if recurring, still make a calendar event for the first occurrence
        if (recurrence !== "once") {
          await db.calendarEvent.create({
            data: {
              title: `Add $${amount}`,
              description,
              startDate: new Date(issueDate),
              endDate: new Date(issueDate),
              variant: "success",
              isRecurring: true,
              recurringDays: recurrence === "weekly" || recurrence === "biweekly"
                ? [new Date(issueDate).getDay()]
                : [],
              recurrenceType: recurrence.toUpperCase(),
              recurrenceInterval: recurrence === "biweekly" ? 2 : 1,
              monthlyDate: recurrence === "monthly" ? selected.getDate() : null,
              metadata: {
                transactionType: "ADD_FUNDS",
                studentId,
                accountType,
                amount
              },
              createdById: teacher.id,
              studentId
            }
          });
        }

        return { studentId, success: true, executed: true };
      })
    );

    const failed = results.filter(r => !r.success);
    if (failed.length) {
      return NextResponse.json({
        warning: "Some operations failed",
        failures: failed
      }, { status: 207 });
    }

    return NextResponse.json({
      success: true,
      message: `Added $${amount} for ${results.length} account(s) on ${new Date(issueDate).toLocaleDateString()}`
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}