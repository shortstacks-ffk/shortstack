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

    // Get month and year from query parameters
    const url = new URL(request.url);
    const monthParam = url.searchParams.get('month');
    const yearParam = url.searchParams.get('year');
    
    // Parse parameters or use current month/year if not provided
    const now = new Date();
    const statementMonth = monthParam ? parseInt(monthParam) - 1 : now.getMonth(); // Convert from 1-12 to 0-11
    const statementYear = yearParam ? parseInt(yearParam) : now.getFullYear();
    
    // Validate parameters
    if (isNaN(statementMonth) || statementMonth < 0 || statementMonth > 11 ||
        isNaN(statementYear) || statementYear < 2020 || statementYear > 2030) {
      return NextResponse.json({ 
        error: "Invalid month or year. Month must be 1-12 and year must be 2020-2030" 
      }, { status: 400 });
    }
    
    const monthName = new Date(statementYear, statementMonth, 1).toLocaleString('default', { month: 'long' });
    
    // Start and end dates for the statement period (full month)
    const startDate = new Date(statementYear, statementMonth, 1);
    const endDate = new Date(statementYear, statementMonth + 1, 0); // Last day of month
    
    // Get all students with bank accounts and their enrollments
    const students = await db.student.findMany({
      include: {
        bankAccounts: true,
        enrollments: {
          include: {
            class: true
          },
          where: {
            enrolled: true
          }
        }
      }
    });
    
    const results = {
      total: 0,
      success: 0,
      failed: 0,
      details: [] as any[]
    };
    
    // Process each student's accounts
    for (const student of students) {
      // Get the student's active class name
      const activeEnrollment = student.enrollments.find(enrollment => enrollment.enrolled);
      const className = activeEnrollment?.class?.name || 'N/A';
      
      for (const account of student.bankAccounts) {
        results.total++;
        
        try {
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
          
          // Skip if no transactions (don't create empty statements)
          if (transactions.length === 0) {
            console.log(`No transactions for ${student.firstName} ${student.lastName}, account: ${account.accountType}`);
            results.details.push({
              studentId: student.id,
              accountId: account.id,
              status: 'skipped',
              reason: 'No transactions found for this period'
            });
            continue;
          }
          
          // Format transaction data for the statement
          const statementData = transactions.map(transaction => ({
            Date: format(new Date(transaction.createdAt), 'MM/dd/yyyy'),
            Time: format(new Date(transaction.createdAt), 'HH:mm:ss'),
            Description: transaction.description,
            Type: transaction.transactionType,
            Amount: transaction.amount.toFixed(2),
          }));
          
          // Create Excel workbook
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(statementData);
          
          // Add headers
          XLSX.utils.sheet_add_aoa(ws, [
            [`Student: ${student.firstName} ${student.lastName}`],
            [`Class: ${className}`],
            [`Account: ${account.accountType} (${account.accountNumber})`],
            [`Statement Period: ${monthName} ${statementYear}`],
            [`Current Balance: $${account.balance.toFixed(2)}`],
            [''] // Empty row
          ], { origin: 'A1' });
          
          // Add data starting at A7
          XLSX.utils.sheet_add_json(ws, statementData, { origin: 'A7' });
          
          // Add the worksheet to the workbook
          XLSX.utils.book_append_sheet(wb, ws, 'Statement');
          
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
          
          // Check if statement already exists for this month/year/account
          const existingStatement = await db.bankStatement.findFirst({
            where: {
              accountId: account.id,
              month: monthName,
              year: statementYear.toString()
            }
          });
          
          if (existingStatement) {
            // Update existing statement
            await db.bankStatement.update({
              where: { id: existingStatement.id },
              data: {
                url: blob.url,
                generatedAt: new Date()
              }
            });
          } else {
            // Create a new statement record
            await db.bankStatement.create({
              data: {
                accountId: account.id,
                studentId: student.id,
                month: monthName,
                year: statementYear.toString(),
                url: blob.url,
                generatedAt: new Date()
              }
            });
          }
          
          results.success++;
          results.details.push({
            studentId: student.id,
            accountId: account.id,
            status: 'success',
            url: blob.url
          });
          
          console.log(`Generated statement for ${student.firstName} ${student.lastName}, account: ${account.accountType}, month: ${monthName} ${statementYear}`);
          
        } catch (error) {
          console.error(`Error generating statement for student ${student.id}, account ${account.id}:`, error);
          results.failed++;
          results.details.push({
            studentId: student.id,
            accountId: account.id,
            status: 'failed',
            error: (error as Error).message
          });
        }
      }
    }
    
    return NextResponse.json({
      message: `Statement generation complete for ${monthName} ${statementYear}`,
      period: {
        month: monthName,
        year: statementYear.toString(),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      results
    });
    
  } catch (error) {
    console.error("Error in test route:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: (error as Error).message 
    }, { status: 500 });
  }
}