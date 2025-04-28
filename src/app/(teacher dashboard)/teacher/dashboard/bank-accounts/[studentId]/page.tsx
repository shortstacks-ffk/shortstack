"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";

import { Separator } from "@/src/components/ui/separator";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Badge } from "@/src/components/ui/badge";
import { formatCurrency } from "@/src/lib/utils";
import { format } from "date-fns";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transactionType: string;
  accountType: string;
  createdAt: string;
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

export default function StudentAccountPage({ 
  params 
}: { 
    params: Promise<{ studentId: string }> 
}) {
    const router = useRouter();
  
    // Use React.use() to unwrap the params Promise
    const resolvedParams = use(params); 
    const { studentId } = resolvedParams; 
  
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("transactions");

  useEffect(() => {
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
    
    fetchStudentData();
  }, [studentId]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!selectedAccountId) return;
      
      try {
        const response = await fetch(`/api/teacher/banking/transactions?accountId=${selectedAccountId}`);
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    };
    
    fetchTransactions();
  }, [selectedAccountId]);

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return "bg-green-100 text-green-800";
      case "WITHDRAWAL":
        return "bg-red-100 text-red-800";
      case "TRANSFER_IN":
        return "bg-blue-100 text-blue-800";
      case "TRANSFER_OUT":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTransactionAmount = (transaction: Transaction) => {
    const isPositive = 
      transaction.transactionType === "DEPOSIT" || 
      transaction.transactionType === "TRANSFER_IN";
      
    const prefix = isPositive ? "+" : "-";
    return `${prefix}${formatCurrency(transaction.amount)}`;
  };

  const downloadStatement = () => {
    if (!selectedAccountId) return;
    
    const accountType = student?.accounts.find(acc => acc.id === selectedAccountId)?.accountType;
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    
    // Navigate to statement download
    window.location.href = `/api/teacher/banking/statements?accountId=${selectedAccountId}&month=${month}&year=${year}&download=true`;
  };

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

  return (
    <div>
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b bg-background">
          <div className="flex flex-1 items-center gap-2 px-4">
            <Breadcrumb>
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
          </div>
          
          <div className="flex items-center gap-2 px-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push("/teacher/dashboard/bank-accounts")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Accounts
            </Button>
          </div>
        </header>
        
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-gray-500">{student.email}</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 mb-6">
            {student.accounts.map((account) => (
              <Card key={account.id} className={account.accountType === "CHECKING" ? "border-blue-200" : "border-green-200"}>
                <CardHeader className={account.accountType === "CHECKING" ? "bg-blue-50" : "bg-green-50"}>
                  <CardTitle>
                    {account.accountType === "CHECKING" ? "Checking Account" : "Savings Account"}
                  </CardTitle>
                  <CardDescription>
                    Account #{account.accountNumber}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold mb-2">
                    {formatCurrency(account.balance)}
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAccountId(account.id)}
                    >
                      View Transactions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="statements">Statements</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-[180px]">
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
                
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                
                <Button variant="outline" onClick={downloadStatement}>
                  <Download className="h-4 w-4 mr-2" /> Statement
                </Button>
              </div>
            </div>
            
            <TabsContent value="transactions" className="p-0">
              <Card>
                <CardHeader className="px-6 py-4">
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    Showing transactions for {
                      student.accounts.find(acc => acc.id === selectedAccountId)?.accountType === "CHECKING" 
                        ? "checking" 
                        : "savings"
                    } account
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                              No transactions found
                            </td>
                          </tr>
                        ) : (
                          transactions.map((transaction) => (
                            <tr key={transaction.id} className="border-t hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                {format(new Date(transaction.createdAt), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-6 py-4">
                                {transaction.description}
                              </td>
                              <td className="px-6 py-4">
                                <Badge 
                                  variant="outline" 
                                  className={getTransactionTypeColor(transaction.transactionType)}
                                >
                                  {transaction.transactionType.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap font-medium">
                                <span 
                                  className={
                                    transaction.transactionType === "DEPOSIT" || 
                                    transaction.transactionType === "TRANSFER_IN" 
                                      ? "text-green-600" 
                                      : "text-red-600"
                                  }
                                >
                                  {getTransactionAmount(transaction)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="statements" className="p-0">
              <Card>
                <CardHeader>
                  <CardTitle>Bank Statements</CardTitle>
                  <CardDescription>
                    Download monthly statements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Generate a list of months for the current year */}
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date();
                      date.setMonth(i);
                      const monthName = date.toLocaleString('default', { month: 'long' });
                      const year = new Date().getFullYear();
                      
                      return (
                        <div key={i} className="flex justify-between items-center p-4 border rounded-md">
                          <div>
                            <h3 className="font-medium">{monthName} {year}</h3>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (!selectedAccountId) return;
                              window.location.href = `/api/teacher/banking/statements?accountId=${selectedAccountId}&month=${monthName}&year=${year}&download=true`;
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" /> Download
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        </div>
  );
}