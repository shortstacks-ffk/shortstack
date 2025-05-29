import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { put } from "@vercel/blob";

// Create path for storing statements in blob storage
const getStatementPath = (studentId: string, accountId: string, month: string, year: string) => {
  return `statements/${studentId}/${accountId}/${year}/${month}/${month}_${year}_statement.xlsx`;
};

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    const authToken = process.env.CRON_SECRET;
    
    // Verify this is a legitimate request with proper authorization
    if (authorization !== `Bearer ${authToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get current date details for creating statements
    const now = new Date();
    
    // If today is not the 27th day of the month and not in development mode, exit
    if (now.getDate() !== 27 && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ 
        message: "Statement generation only runs on the 27th day of each month"
      });
    }
    
    // For generating statements, we'll use the current month's data
    const statementMonth = now.getMonth(); // Current month (0-11)
    const statementYear = now.getFullYear();
    const monthName = new Date(statementYear, statementMonth, 1).toLocaleString('default', { month: 'long' });
    
    // Start and end dates for the statement period (full month)
    const startDate = new Date(statementYear, statementMonth, 1);
    const endDate = new Date(statementYear, statementMonth + 1, 0); // Last day of month
    
    // Get all students with bank accounts
    const students = await db.student.findMany({
      include: {
        bankAccounts: true,
        class: true
      }
    });
    
    const results = {
      total: 0,
      success: 0,
      failed: 0,
      noTransactions: 0,
      details: [] as any[]
    };
    
    // Process each student's accounts
    for (const student of students) {
      // Get unique accounts to prevent duplication
      const uniqueAccountsMap = new Map();
      student.bankAccounts.forEach(account => {
        // Only add if not already present with same account type
        const key = `${account.accountType}`;
        if (!uniqueAccountsMap.has(key)) {
          uniqueAccountsMap.set(key, account);
        }
      });
      
      const uniqueAccounts = Array.from(uniqueAccountsMap.values());
      
      for (const account of uniqueAccounts) {
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
            results.noTransactions++;
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
          
          // Create or update a record in the database
          const existingStatement = await db.bankStatement.findFirst({
            where: {
              accountId: account.id,
              month: monthName,
              year: statementYear.toString()
            }
          });
          
          if (existingStatement) {
            await db.bankStatement.update({
              where: { id: existingStatement.id },
              data: {
                url: blob.url,
                generatedAt: new Date()
              }
            });
          } else {
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
      message: "Statement generation complete",
      period: {
        month: monthName,
        year: statementYear,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      results
    });
  } catch (error) {
    console.error("Error generating statements:", error);
    return NextResponse.json({ 
      error: "Internal Server Error",
      details: (error as Error).message
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Call the generate statements API with the CRON_SECRET
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/banking/generate-statements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in cron job:", error);
    return NextResponse.json({ error: "Error running statement generation" }, { status: 500 });
  }
}