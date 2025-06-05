"use client";

import { useState, useEffect, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, RefreshCw, FileText, Calendar, ChevronRight, Loader2 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/src/components/ui/breadcrumb";

import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { formatCurrency } from "@/src/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import RecurringTransactionsDialog from "../RecurringTransactionsDialog";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transactionType: string;
  accountType: string;
  createdAt: string;
  accountId: string;
}

interface StudentAccount {
  id: string;
  accountNumber: string;
  accountType: string;
  balance: number;
}

interface StudentDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accounts: StudentAccount[];
}

function StudentAccountContent({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("transactions");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isDownloadingStatement, setIsDownloadingStatement] = useState<number | null>(null);
  const [availableStatements, setAvailableStatements] = useState<Record<string, boolean>>({});
  const [isStatementsLoading, setIsStatementsLoading] = useState(false);
  const [isRecurringTransactionsOpen, setIsRecurringTransactionsOpen] = useState(false);


  // Define fetch functions
  const fetchStudentData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/teacher/banking/students/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setStudent(data);
        
        // Set the first account as default
        if (data.accounts.length > 0) {
          setSelectedAccountId(data.accounts[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!selectedAccountId) return;
    
    setIsTransactionsLoading(true);
    try {
      const response = await fetch(`/api/teacher/banking/transactions?accountId=${selectedAccountId}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsTransactionsLoading(false);
    }
  };
  
  // Use the functions in useEffect hooks
  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  useEffect(() => {
    fetchTransactions();
  }, [selectedAccountId]);
  
  // Fix the reload function to call these functions
  const reloadData = () => {
    fetchStudentData();
    fetchTransactions();
  };

  // Determine the display type based on transaction type and direction
  const getDisplayTransactionType = (transaction: Transaction) => {
    if (transaction.transactionType === "DEPOSIT") {
      return "Deposit";
    } else if (transaction.transactionType === "WITHDRAWAL") {
      return "Withdrawn";
    } else if (transaction.transactionType === "TRANSFER_OUT") {
      // For transfers from checking to savings, show as "Withdrawn"
      if (transaction.description?.includes("Transfer from Checking to Savings")) {
        return "Withdrawn";
      }
      return "Transfer";
    } else if (transaction.transactionType === "TRANSFER_IN") {
      return "Transfer";
    } else {
      return transaction.transactionType;
    }
  };
  
  const getTransactionColor = (transaction: Transaction) => {
    const displayType = getDisplayTransactionType(transaction);
    
    switch (displayType) {
      case "Deposit":
        return "text-green-600";
      case "Withdrawn":
        return "text-red-600";
      case "Transfer":
        return "text-blue-600";
      default:
        return "";
    }
  };
  
  const getBadgeBackgroundColor = (transaction: Transaction) => {
    const displayType = getDisplayTransactionType(transaction);
    
    switch (displayType) {
      case "Deposit":
        return "bg-green-100";
      case "Withdrawn":
        return "bg-red-100";
      case "Transfer":
        return "bg-blue-100";
      default:
        return "bg-gray-100";
    }
  };
  
  const formatTransactionAmount = (transaction: Transaction) => {
    const displayType = getDisplayTransactionType(transaction);
    
    switch (displayType) {
      case "Deposit":
        return `+${formatCurrency(transaction.amount)}`;
      case "Withdrawn":
        return `-${formatCurrency(transaction.amount)}`;
      case "Transfer":
        return `•${formatCurrency(transaction.amount)}`;
      default:
        return formatCurrency(transaction.amount);
    }
  };
  
  // Helper to determine account name from ID
  const getAccountTypeByID = (accountId: string) => {
    const account = student?.accounts.find(acc => acc.id === accountId);
    return account?.accountType === "CHECKING" ? "Checking" : "Savings";
  };

  const refreshTransactions = async () => {
    if (!selectedAccountId) return;
    
    setIsTransactionsLoading(true);
    try {
      const response = await fetch(`/api/teacher/banking/transactions?accountId=${selectedAccountId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error refreshing transactions:", error);
    } finally {
      setIsTransactionsLoading(false);
    }
  };

  

// Function to fetch available statements
const fetchAvailableStatements = async (yearToFetch = selectedYear) => {
  if (!selectedAccountId) return;
  
  setIsStatementsLoading(true);
  try {
    const response = await fetch(`/api/teacher/banking/available-statements?accountId=${selectedAccountId}&year=${yearToFetch}`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Create a map of month => available
      const statementsMap: Record<string, boolean> = {};
      data.statements.forEach((statement: any) => {
        statementsMap[statement.month] = true;
      });
      
      setAvailableStatements(statementsMap);
    }
  } catch (error) {
    console.error("Error fetching available statements:", error);
  } finally {
    setIsStatementsLoading(false);
  }
};

// Update the download statement function
const downloadStatement = async (monthName: string, monthIndex: number) => {
  if (!selectedAccountId) return;
  
  setIsDownloadingStatement(monthIndex);
  
  try {
    // Get the statement ID first
    const response = await fetch(`/api/teacher/banking/statement-id?accountId=${selectedAccountId}&month=${monthName}&year=${selectedYear}`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.exists && data.statementId) {
        // Use the universal download endpoint
        const downloadUrl = `/api/banking/statements/download?id=${data.statementId}`;
        
        window.open(downloadUrl, '_blank');
        toast.success(`${monthName} ${selectedYear} statement opened in a new tab`);
      } else {
        toast.error(`No statement available for ${monthName} ${selectedYear}`);
      }
    } else {
      throw new Error("Failed to get statement information");
    }
  } catch (error) {
    console.error("Error downloading statement:", error);
    toast.error("Failed to download statement");
  } finally {
    setIsDownloadingStatement(null);
  }
};

// Call fetchAvailableStatements whenever accountId changes
useEffect(() => {
  if (selectedAccountId) {
    fetchAvailableStatements();
  }
}, [selectedAccountId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading student account details...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Student not found or you don't have permission to view this account.</p>
      </div>
    );
  }

  const checkingAccount = student.accounts.find(acc => acc.accountType === "CHECKING");
  const savingsAccount = student.accounts.find(acc => acc.accountType === "SAVINGS");

  // Available years - current year and two future years
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear+1, currentYear+2];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b bg-white">
        <div className="flex flex-1 items-center gap-2 px-4">
          <Breadcrumb className="hidden sm:flex">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/teacher/dashboard/bank-accounts">
                  Bank Accounts
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {student.firstName} {student.lastName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* Mobile title */}
          <h2 className="text-base font-medium sm:hidden truncate">
            {student.firstName} {student.lastName}
          </h2>
        </div>
        
        <div className="flex items-center gap-2 px-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push("/teacher/dashboard/bank-accounts")}
            className="whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </header>
      
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm sm:text-base text-gray-500">{student.email}</p>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 mb-4 sm:mb-6">
          {checkingAccount && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <span>Checking Account</span>
                  <span className="text-sm font-normal text-blue-700 bg-blue-100 px-2 py-1 rounded">
                    #{checkingAccount.accountNumber}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">
                  {formatCurrency(checkingAccount.balance)}
                </div>
              </CardContent>
            </Card>
          )}
          
          {savingsAccount && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <span>Savings Account</span>
                  <span className="text-sm font-normal text-green-700 bg-green-100 px-2 py-1 rounded">
                    #{savingsAccount.accountNumber}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">
                  {formatCurrency(savingsAccount.balance)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <Card className="bg-white rounded-lg shadow-sm h-auto">
          <CardHeader className="border-b px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="statements">Statements</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {student.accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountType === "CHECKING" ? "Checking" : "Savings"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={refreshTransactions} 
                    disabled={isTransactionsLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isTransactionsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setIsRecurringTransactionsOpen(true)}
                    className="ml-2"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Recurring Transactions
                  </Button>
                </div>
                
                {/* Transaction Tab Content */}
                <TabsContent value="transactions" className="mt-4 p-0">
                  <div className="mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold">Transaction History</h2>
                    <p className="text-sm text-gray-500">
                      Showing transactions for {getAccountTypeByID(selectedAccountId)} account
                    </p>
                  </div>
                  
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-orange-500">
                          <th className="py-2 px-3 sm:px-4 text-left text-white font-medium">Date</th>
                          <th className="py-2 px-3 sm:px-4 text-left text-white font-medium">Description</th>
                          <th className="py-2 px-3 sm:px-4 text-left text-white font-medium">Type</th>
                          <th className="py-2 px-3 sm:px-4 text-right text-white font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isTransactionsLoading ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center">
                              <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
                            </td>
                          </tr>
                        ) : transactions.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                              No transactions found
                            </td>
                          </tr>
                        ) : (
                          transactions.map((transaction) => {
                            const displayType = getDisplayTransactionType(transaction);
                            const transactionColor = getTransactionColor(transaction);
                            const badgeBackground = getBadgeBackgroundColor(transaction);
                            
                            return (
                              <tr key={transaction.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                                  {format(new Date(transaction.createdAt), 'MMM dd, yyyy')}
                                </td>
                                <td className="py-3 px-3 sm:px-4 max-w-[150px] sm:max-w-none truncate text-xs sm:text-sm">
                                  {transaction.description || "The Value of Saving"}
                                </td>
                                <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm">
                                  <span className={`${transactionColor}`}>
                                    {displayType}
                                  </span>
                                </td>
                                <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap text-xs sm:text-sm">
                                  <span className={`inline-flex px-2 sm:px-3 py-1 rounded-full font-medium ${badgeBackground} ${transactionColor}`}>
                                    {formatTransactionAmount(transaction)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
                
                {/* Statements Tab Content */}
                <TabsContent value="statements" className="mt-4 p-0">
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div>
                        <h2 className="text-lg sm:text-xl font-semibold">Bank Statements</h2>
                        <p className="text-sm text-gray-500">
                          Available statements for {getAccountTypeByID(selectedAccountId)} account
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select 
                          value={selectedYear.toString()} 
                          onValueChange={(val) => {
                            setSelectedYear(parseInt(val));
                            // Fetch available statements for new year
                            fetchAvailableStatements(parseInt(val));
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-[120px]">
                            <SelectValue placeholder={selectedYear.toString()} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableYears.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {isStatementsLoading ? (
                      <div className="flex justify-center items-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        {Array.from({ length: 12 }, (_, i) => {
                          const date = new Date(selectedYear, i, 1);
                          const monthName = date.toLocaleString('default', { month: 'long' });
                          const currentDate = new Date();
                          const isFuture = date > currentDate;
                          // Check if we have this in our available statements
                          const isAvailable = availableStatements[monthName];
                          const isDisabled = isFuture || !isAvailable;
                          const isDownloading = isDownloadingStatement === i;
                          
                          return (
                            <div 
                              key={i}
                              className={`border rounded-lg overflow-hidden ${
                                isDisabled ? 'bg-gray-50 opacity-60 pointer-events-none' : 'bg-white hover:bg-gray-50 cursor-pointer'
                              }`}
                              onClick={() => !isDisabled && !isDownloading && downloadStatement(monthName, i)}
                            >
                              <div className="border-b px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center">
                                  <Calendar className={`h-4 w-4 mr-2 ${isDisabled ? 'text-gray-400' : 'text-green-600'}`} />
                                  <span className="font-medium">{monthName}</span>
                                </div>
                                <span className="text-sm text-gray-500">{selectedYear}</span>
                              </div>
                              
                              <div className="px-4 py-3">
                                <div className="text-sm text-gray-600 mb-1">
                                  {getAccountTypeByID(selectedAccountId)} Statement
                                </div>
                                
                                <div className="flex justify-between items-center mt-2">
                                  <div className="text-xs text-gray-500">
                                    {isFuture ? 'Not yet available' : 
                                      isAvailable ? 'Generated on the 27th' : 'No transactions'}
                                  </div>
                                  {isDownloading ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                  ) : (
                                    isAvailable && <Download className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="text-center text-sm text-gray-500 pt-2">
                      Statements are generated on the 27th of each month
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
            {activeTab === "transactions" || activeTab === "statements" ? null : (
              <div className="flex justify-center items-center h-40">
                <p className="text-gray-500">Select a tab to view account details</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {student && (
          <RecurringTransactionsDialog
            open={isRecurringTransactionsOpen}
            onClose={() => setIsRecurringTransactionsOpen(false)}
            studentId={student.id}
            students={[{
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName
            }]}
            onComplete={() => {
              // Refresh data if needed
              fetchStudentData();
              fetchTransactions();
            }}
          />
        )}
      </div>
    </div>
  );
}

// Loading fallback component
function LoadingStudentAccount() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-spin h-10 w-10 rounded-full border-4 border-orange-500 border-t-transparent"></div>
    </div>
  );
}

// Main component that resolves the params promise and wraps content with Suspense
export default function StudentAccountPage({ 
  params 
}: { 
  params: Promise<{ studentId: string }> 
}) {
  // Use React.use() to unwrap the params Promise
  const resolvedParams = use(params); 
  const { studentId } = resolvedParams;

  return (
    <Suspense fallback={<LoadingStudentAccount />}>
      <StudentAccountContent studentId={studentId} />
    </Suspense>
  );
}