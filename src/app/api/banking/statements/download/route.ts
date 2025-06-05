import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { put } from "@vercel/blob";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    
    // Allow both statement ID or parameters
    const statementId = url.searchParams.get('id');
    const accountId = url.searchParams.get('accountId');
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');
    
    let statement;
    
    if (statementId) {
      // Find by statement ID
      statement = await db.bankStatement.findUnique({
        where: { id: statementId },
        include: {
          student: { include: { class: true } },
          account: true
        }
      });
    } 
    else if (accountId && month && year) {
      // Find by parameters
      statement = await db.bankStatement.findFirst({
        where: {
          accountId,
          month,
          year
        },
        include: {
          student: { include: { class: true } },
          account: true
        }
      });
      
      // If statement doesn't exist but user has permission to view it,
      // try to generate it on-demand if we have passed the 27th of the month
      if (!statement) {
        const monthNum = getMonthNumber(month);
        const yearNum = parseInt(year);
        const targetDate = new Date(yearNum, monthNum, 1);
        const endOfMonth = new Date(yearNum, monthNum + 1, 0);
        const today = new Date();
        
        // Only generate if we've passed the 27th of the target month
        // or if the month is in the past
        const canGenerate = today.getDate() >= 27 || today > endOfMonth;
        
        if (canGenerate) {
          statement = await generateStatementOnDemand(accountId, month, year);
        }
      }
    }
    else {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (!statement) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    // Check authorization based on role
    if (session.user.role === "STUDENT") {
      // Students can only access their own statements
      const studentRecord = await db.student.findFirst({
        where: {
          OR: [
            { userId: session.user.id },
            ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
          ]
        }
      });

      if (!studentRecord || studentRecord.id !== statement.studentId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } 
    else if (session.user.role === "TEACHER") {
      // Teachers can only access statements for students in their classes
      const teacherHasAccess = await db.class.findFirst({
        where: {
          userId: session.user.id,
          code: statement.student.classId ?? undefined
        }
      });

      if (!teacherHasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }
    else {
      return NextResponse.json({ error: "Invalid role" }, { status: 403 });
    }

    // Redirect to the blob URL with proper filename
    const fileName = `${statement.month}_${statement.year}_${statement.account.accountType}_Statement.xlsx`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': statement.url,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      }
    });
  } catch (error) {
    console.error("Error downloading statement:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Helper function to convert month name to number (0-11)
function getMonthNumber(monthName: string): number {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
}

// Helper function to generate a statement on demand
async function generateStatementOnDemand(accountId: string, month: string, year: string) {
  try {
    // Find account and related student information
    const account = await db.bankAccount.findUnique({
      where: { id: accountId },
      include: {
        student: {
          include: { class: true }
        }
      }
    });

    if (!account) {
      console.error(`Account with ID ${accountId} not found`);
      return null;
    }

    const student = account.student;
    const yearNum = parseInt(year);
    const monthNum = getMonthNumber(month);
    
    // Get start and end date for the statement period
    const startDate = new Date(yearNum, monthNum, 1);
    const endDate = new Date(yearNum, monthNum + 1, 0); // Last day of month
    
    // Get transactions for this account within the date range
    const transactions = await db.transaction.findMany({
      where: {
        OR: [
          { accountId: account.id },
          { receivingAccountId: account.id }
        ],
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    
    // Don't generate statement if no transactions
    if (transactions.length === 0) {
      console.log(`No transactions for ${student.firstName} ${student.lastName}, account: ${account.accountType}, month: ${month} ${year}`);
      return null;
    }
    
    // Format transaction data for the statement with all required columns
    const statementData = transactions.map(transaction => ({
      'Student Name': `${student.firstName} ${student.lastName}`,
      'Class': student.class?.name || 'N/A',
      'Date': format(new Date(transaction.createdAt), 'MM/dd/yyyy'),
      'Time': format(new Date(transaction.createdAt), 'HH:mm:ss'),
      'Description': transaction.description,
      'Type': transaction.transactionType,
      'Amount': transaction.amount.toFixed(2),
      'Statement Period': `${month} ${year}`,
      'Balance': account.balance.toFixed(2),
      'Account': `${account.accountType} (${account.accountNumber})`
    }));
    
    // Create Excel workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(statementData);
    
    // Set column widths
    const wscols = [
      { wch: 20 },  // Student Name
      { wch: 15 },  // Class
      { wch: 12 },  // Date
      { wch: 10 },  // Time
      { wch: 30 },  // Description
      { wch: 15 },  // Type
      { wch: 10 },  // Amount
      { wch: 20 },  // Statement Period
      { wch: 12 },  // Balance
      { wch: 15 },  // Account
    ];
    ws['!cols'] = wscols;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Statement');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Convert to Buffer for storage
    const buffer = Buffer.from(excelBuffer);
    
    // Store in Vercel Blob
    const path = `statements/${student.id}/${account.id}/${year}/${month}/${month}_${year}_statement.xlsx`;
    
    const blob = await put(path, buffer, {
      access: 'public',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    // Create a record in the database
    const statement = await db.bankStatement.create({
      data: {
        accountId: account.id,
        studentId: student.id,
        month: month,
        year: year.toString(),
        url: blob.url,
        generatedAt: new Date()
      },
      include: {
        student: {
          include: { class: true }
        },
        account: true
      }
    });
    
    console.log(`Generated on-demand statement for ${student.firstName} ${student.lastName}, account: ${account.accountType}, month: ${month} ${year}`);
    return statement;
    
  } catch (error) {
    console.error("Error generating statement on demand:", error);
    return null;
  }
}