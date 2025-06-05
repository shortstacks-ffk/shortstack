import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { put } from "@vercel/blob";

// Create path for storing statements in blob storage
const getStatementPath = (studentId: string, accountId: string, month: string, year: string) => {
  return `statements/${studentId}/${accountId}/${year}/${month}/${month}_${year}_statement.xlsx`;
};

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow teacher role to access this
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get required parameters
    const url = new URL(request.url);
    const studentId = url.searchParams.get('studentId');
    const accountId = url.searchParams.get('accountId');
    const month = url.searchParams.get('month'); // 1-12
    const year = url.searchParams.get('year');
    
    if (!studentId || !accountId || !month || !year) {
      return NextResponse.json({ 
        error: "Missing required parameters: studentId, accountId, month, year" 
      }, { status: 400 });
    }

    // Validate parameters
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12 ||
        isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
      return NextResponse.json({ 
        error: "Invalid month or year. Month must be 1-12 and year must be 2020-2030" 
      }, { status: 400 });
    }

    // Find student and verify teacher has access
    const student = await db.student.findFirst({
      where: {
        id: studentId
      },
      include: {
        class: true
      }
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if teacher has access to this student's class
    const teacherClass = await db.class.findFirst({
      where: {
        userId: session.user.id,
        code: student.classId ?? undefined // Use classId if available
      }
    });

    if (!teacherClass) {
      return NextResponse.json({ 
        error: "You do not have permission to access this student's records" 
      }, { status: 403 });
    }

    // Find the student's bank account
    const account = await db.bankAccount.findFirst({
      where: {
        id: accountId,
        studentId: student.id
      }
    });

    if (!account) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    // Convert 1-based month to 0-based for JavaScript Date
    const statementMonth = monthNum - 1; 
    const statementYear = yearNum;
    const monthName = new Date(statementYear, statementMonth, 1).toLocaleString('default', { month: 'long' });
    
    // Check if statement already exists
    const existingStatement = await db.bankStatement.findFirst({
      where: {
        studentId: student.id,
        accountId: account.id,
        month: monthName,
        year: year
      }
    });

    if (existingStatement) {
      return NextResponse.json({ 
        message: "Statement already exists",
        statementId: existingStatement.id,
        url: existingStatement.url
      });
    }

    // Start and end dates for the statement period (full month)
    const startDate = new Date(statementYear, statementMonth, 1);
    const endDate = new Date(statementYear, statementMonth + 1, 0); // Last day of month
    
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
    
    // If no transactions, return early
    if (transactions.length === 0) {
      return NextResponse.json({ 
        message: "No transactions found for this period. Statement not generated.",
        noTransactions: true
      });
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
      'Statement Period': `${monthName} ${statementYear}`,
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
    const path = getStatementPath(student.id, account.id, monthName, statementYear.toString());
    
    const blob = await put(path, buffer, {
      access: 'public',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    // Create a record in the database
    const statement = await db.bankStatement.create({
      data: {
        accountId: account.id,
        studentId: student.id,
        month: monthName,
        year: statementYear.toString(),
        url: blob.url,
        generatedAt: new Date()
      }
    });
    
    return NextResponse.json({
      message: "Statement generated successfully",
      statementId: statement.id,
      url: statement.url
    });
    
  } catch (error) {
    console.error("Error generating statement:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: (error as Error).message 
    }, { status: 500 });
  }
}