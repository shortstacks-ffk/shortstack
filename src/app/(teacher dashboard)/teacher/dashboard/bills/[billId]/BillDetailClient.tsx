"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import { getBillStatus } from "@/src/lib/bill-utils";
import Link from "next/link";
import { 
  ChevronLeft, 
  AlertCircle, 
  CalendarDays, 
  Clock, 
  CreditCard, 
  Users, 
  CheckCircle2, 
  XCircle, 
  BarChart3,
  Receipt,
  Minus,
  Plus,
  UserPlus,
  BookOpen
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Progress } from "@/src/components/ui/progress";
import { Badge } from "@/src/components/ui/badge";
import { Separator } from "@/src/components/ui/separator";
import RemoveBillFromClassesDialog from "@/src/components/bills/RemoveBillFromClassesDialog";
import ExcludeStudentsDialog from "@/src/components/bills/ExcludeStudentsDialog";
import AssignBillDialog from "@/src/components/bills/AssignBillDialog";
import IncludeStudentsDialog from "@/src/components/bills/IncludeStudentsDialog";
import { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/button";

interface BillClass {
  id: string;
  name: string;
  emoji: string;
  code: string;
}

interface StudentBill {
  studentId: string;
  billId: string;
  isPaid: boolean;
  paidAt: Date | null;
  paidAmount?: number;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    schoolEmail?: string;
    class?: {
      id: string;
      name: string;
      emoji: string;
    }
  }
}

interface BillDetailClientProps {
  bill: any;
}

export function BillDetailClient({ bill }: BillDetailClientProps) {
  const [showRemoveClassDialog, setShowRemoveClassDialog] = useState(false);
  const [showExcludeStudentDialog, setShowExcludeStudentDialog] = useState(false);
  const [showAssignClassDialog, setShowAssignClassDialog] = useState(false);
  const [showIncludeStudentDialog, setShowIncludeStudentDialog] = useState(false);
  const [currentBillStatus, setCurrentBillStatus] = useState(bill.status);

  // Update bill status on component mount and periodically
  useEffect(() => {
    const updateStatus = () => {
      try {
        const newStatus = getBillStatus(bill);
        setCurrentBillStatus(newStatus);
      } catch (error) {
        console.error("Error updating bill status:", error);
        setCurrentBillStatus(bill.status);
      }
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    
    return () => clearInterval(interval);
  }, [bill]);

  // Format the frequency for display
  const formatFrequency = (freq: string) => {
    switch (freq) {
      case "ONCE": return "One Time";
      case "WEEKLY": return "Weekly";
      case "BIWEEKLY": return "Bi-weekly";
      case "MONTHLY": return "Monthly";
      case "QUARTERLY": return "Quarterly";
      case "YEARLY": return "Yearly";
      default: return freq;
    }
  };
  
  // Calculate payment statistics
  const totalStudents = bill.students?.length || 0;
  const paidStudents: number = bill.students?.filter((s: StudentBill) => s.isPaid).length || 0;
  const partiallyPaidStudents: number = bill.students?.filter((s: StudentBill) => !s.isPaid && (s.paidAmount || 0) > 0).length || 0;
  const unpaidStudents = totalStudents - paidStudents - partiallyPaidStudents;
  const paymentPercentage = totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 100) : 0;
  
  // Calculate total amount collected and pending
  const totalAmount = bill.amount * totalStudents;
  const collectedAmount = bill.students?.reduce((sum: number, s: StudentBill) => {
    return sum + (s.isPaid ? bill.amount : (s.paidAmount || 0));
  }, 0) || 0;
  const pendingAmount = totalAmount - collectedAmount;
  
  // Group students by class for better organization
  const studentsByClass = bill.students?.reduce((acc: Record<string, { classInfo: any, students: StudentBill[] }>, studentBill: StudentBill) => {
    const className = studentBill.student.class?.name || "Unassigned";
    if (!acc[className]) {
      acc[className] = {
        classInfo: studentBill.student.class || { id: "none", name: "Unassigned", emoji: "❓" },
        students: []
      };
    }
    acc[className].students.push(studentBill);
    return acc;
  }, {} as Record<string, { classInfo: any, students: StudentBill[] }>);

  // Format date for display
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };
  
  // Get due date status with improved logic
  const getDueDateStatus = () => {
    const now = new Date();
    const dueDate = new Date(bill.dueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return <Badge variant="destructive">{overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue</Badge>;
    } else if (diffDays === 0) {
      return <Badge variant="destructive">Due today</Badge>;
    } else if (diffDays === 1) {
      return <Badge variant="outline">Due tomorrow</Badge>;
    } else {
      return <Badge variant="outline">{diffDays} day{diffDays !== 1 ? 's' : ''} left</Badge>;
    }
  };

  const dueDateStatus = getDueDateStatus();

  // Get status badge with improved styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="default" className="bg-green-600">Paid</Badge>;
      case "PARTIAL":
        return <Badge variant="outline" className="border-yellow-600 text-yellow-600">Partial</Badge>;
      case "LATE":
        return <Badge variant="destructive">Late</Badge>;
      case "DUE":
        return <Badge variant="outline" className="border-orange-600 text-orange-600">Due</Badge>;
      case "ACTIVE":
        return <Badge variant="outline" className="border-blue-600 text-blue-600">Active</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="border-gray-600 text-gray-600">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // For recurring bills, calculate next occurrence
  const getNextOccurrence = () => {
    if (bill.frequency === "ONCE") return null;
    
    const dueDate = new Date(bill.dueDate);
    const today = new Date();
    
    if (dueDate > today) return dueDate;
    
    const nextDate = new Date(dueDate);
    while (nextDate < today) {
      switch (bill.frequency) {
        case "WEEKLY":
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case "BIWEEKLY":
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case "MONTHLY":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case "QUARTERLY":
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case "YEARLY":
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
    }
    
    return nextDate;
  };
  
  const nextOccurrence = getNextOccurrence();

  return (
    <div className="w-full h-full bg-gray-50"> {/* Ensure consistent background */}
      {/* Fixed header section */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link 
            href="/teacher/dashboard/bills" 
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Back to Bills</span>
          </Link>
          
          <div className="flex items-center space-x-3">
            {getStatusBadge(currentBillStatus)}
            {dueDateStatus}
          </div>
        </div>
      </div>

      {/* Scrollable content area with consistent background */}
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 space-y-6 pb-8 min-h-full bg-gray-50">
          {/* Header Section - now more compact */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <span className="text-4xl mr-4">{bill.emoji}</span>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{bill.title}</h1>
                  <p className="text-gray-600 mt-1">
                    {formatFrequency(bill.frequency)} • 
                    <span className="ml-1">{formatDate(bill.dueDate)}</span>
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(bill.amount)} per student
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Overview Cards - made more compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Total Value
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <span className="text-green-600 font-medium">{formatCurrency(collectedAmount)}</span>
                  <span className="mx-1">collected</span> •
                  <span className="ml-1 text-amber-600 font-medium">{formatCurrency(pendingAmount)}</span>
                  <span className="ml-1">pending</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Student Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between items-center">
                  <p className="text-2xl font-bold text-gray-900">{paidStudents}/{totalStudents}</p>
                  <p className="text-xl font-bold text-gray-500">{paymentPercentage}%</p>
                </div>
                <Progress value={paymentPercentage} className="h-2 mt-3" />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">{paidStudents} paid</span>
                  </div>
                  {partiallyPaidStudents > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-yellow-600" />
                      <span className="text-yellow-600">{partiallyPaidStudents} partial</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-amber-600" />
                    <span className="text-amber-600">{unpaidStudents} unpaid</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-lg font-bold text-gray-900">
                  {formatFrequency(bill.frequency)}
                </p>
                {bill.frequency !== "ONCE" && nextOccurrence && (
                  <>
                    <p className="mt-1 text-sm flex items-center text-gray-700">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Next: </span>
                      <span className="ml-1 font-medium">
                        {formatDate(nextOccurrence)}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Recurring {formatFrequency(bill.frequency).toLowerCase()}
                    </p>
                  </>
                )}
                {bill.frequency === "ONCE" && (
                  <p className="mt-1 text-xs text-gray-500">
                    One-time payment
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Tabs Section - now more compact */}
          <div className="bg-white rounded-lg shadow-sm">
            <Tabs defaultValue="details">
              <div className="border-b px-6 pt-4">
                <TabsList className="w-full justify-start bg-transparent h-auto p-0">
                  <TabsTrigger 
                    value="details" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger 
                    value="classes"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3"
                  >
                    Classes ({bill.class?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="students"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3"
                  >
                    Students ({totalStudents})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="payments"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3"
                  >
                    Payments
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* Tab Contents with proper padding */}
              <div className="p-6">
                <TabsContent value="details" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-900">Payment Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Amount per student</p>
                          <p className="font-medium text-gray-900">{formatCurrency(bill.amount)}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Due Date</p>
                          <p className="font-medium text-gray-900">{formatDate(bill.dueDate)}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Frequency</p>
                          <p className="font-medium text-gray-900">{formatFrequency(bill.frequency)}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Status</p>
                          <div>{getStatusBadge(currentBillStatus)}</div>
                        </div>
                        <div className="flex justify-between py-2">
                          <p className="text-gray-600">Created</p>
                          <p className="font-medium text-gray-900">{formatDate(bill.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-900">Collection Summary</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Total Students</p>
                          <p className="font-medium text-gray-900">{totalStudents}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Paid</p>
                          <p className="font-medium text-green-600">{paidStudents} ({paymentPercentage}%)</p>
                        </div>
                        {partiallyPaidStudents > 0 && (
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <p className="text-gray-600">Partial</p>
                            <p className="font-medium text-yellow-600">{partiallyPaidStudents}</p>
                          </div>
                        )}
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Unpaid</p>
                          <p className="font-medium text-amber-600">{unpaidStudents}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Collected</p>
                          <p className="font-medium text-green-600">{formatCurrency(collectedAmount)}</p>
                        </div>
                        <div className="flex justify-between py-2">
                          <p className="text-gray-600">Outstanding</p>
                          <p className="font-medium text-amber-600">{formatCurrency(pendingAmount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {bill.description && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-semibold mb-3 text-gray-900">Description</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{bill.description}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                {/* Classes Tab */}
                <TabsContent value="classes" className="mt-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Assigned Classes</h3
                    >
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowAssignClassDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign to Classes
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowRemoveClassDialog(true)}
                        disabled={!bill.class?.length}
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Unassign from Classes
                      </Button>
                    </div>
                  </div>
                  
                  {bill.class && bill.class.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bill.class.map((cls: BillClass) => (
                        <div key={cls.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{cls.emoji}</span>
                            <div>
                              <Link 
                                href={`/teacher/dashboard/classes/${cls.code}`}
                                className="font-medium text-blue-600 hover:underline"
                              >
                                {cls.name}
                              </Link>
                              <p className="text-sm text-gray-600">Code: {cls.code}</p>
                            </div>
                          </div>
                          
                          {studentsByClass && studentsByClass[cls.name] && (
                            <div className="mt-2 text-sm">
                              <p className="text-gray-600">
                                {studentsByClass[cls.name].students.length} students assigned
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  <span className="text-green-600">
                                    {studentsByClass[cls.name].students.filter((s: StudentBill) => s.isPaid).length} paid
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3 text-amber-600" />
                                  <span className="text-amber-600">
                                    {studentsByClass[cls.name].students.filter((s: StudentBill) => !s.isPaid).length} unpaid
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">This bill is not assigned to any classes</p>
                      <p className="text-sm text-gray-400 mt-1 mb-4">
                        You can assign this bill to classes to collect payments from students
                      </p>
                      <Button 
                        onClick={() => setShowAssignClassDialog(true)}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign to Classes
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                {/* Students Tab */}
                <TabsContent value="students" className="mt-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Students Assigned to this Bill</h3
                    >
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowIncludeStudentDialog(true)}
                        disabled={totalStudents === 0}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Include Students
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowExcludeStudentDialog(true)}
                        disabled={totalStudents === 0}
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Exclude Students
                      </Button>
                    </div>
                  </div>
                  
                  {totalStudents > 0 ? (
                    <div className="overflow-x-auto">
                      {studentsByClass && Object.keys(studentsByClass).length > 0 ? (
                        <div className="space-y-6">
                          {Object.keys(studentsByClass).map(className => (
                            <div key={className}>
                              <div className="flex items-center mb-2">
                                <span className="text-xl mr-2">
                                  {studentsByClass[className].classInfo.emoji || "❓"}
                                </span>
                                <h3 className="text-lg font-semibold">{className}</h3>
                              </div>
                              
                              <div className="rounded-lg border overflow-hidden">
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Student</th>
                                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Email</th>
                                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Amount</th>
                                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Status</th>
                                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Payment Date</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {studentsByClass[className].students.map((studentBill: StudentBill) => (
                                      <tr key={studentBill.studentId} className="hover:bg-gray-50">
                                        <td className="py-3 px-4">{studentBill.student.firstName} {studentBill.student.lastName}</td>
                                        <td className="py-3 px-4 text-gray-500">
                                          {studentBill.student.schoolEmail || "-"}
                                        </td>
                                        <td className="py-3 px-4">
                                          {studentBill.isPaid ? (
                                            <span className="text-green-600 font-medium">{formatCurrency(bill.amount)}</span>
                                          ) : (studentBill.paidAmount || 0) > 0 ? (
                                            <span className="text-yellow-600 font-medium">
                                              {formatCurrency(studentBill.paidAmount || 0)} / {formatCurrency(bill.amount)}
                                            </span>
                                          ) : (
                                            <span className="text-gray-500">{formatCurrency(bill.amount)}</span>
                                          )}
                                        </td>
                                        <td className="py-3 px-4">
                                          <Badge variant={
                                            studentBill.isPaid ? "default" : 
                                            (studentBill.paidAmount || 0) > 0 ? "outline" : "secondary"
                                          }>
                                            {studentBill.isPaid ? "Paid" : 
                                             (studentBill.paidAmount || 0) > 0 ? "Partial" : "Unpaid"}
                                          </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-gray-500">
                                          {studentBill.paidAt ? formatDate(studentBill.paidAt) : "-"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-8 text-gray-500">No student data available</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Users className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">No students assigned to this bill</p>
                      <p className="text-sm text-gray-400 mt-1 mb-4">
                        Assign this bill to classes first to include students
                      </p>
                      <Button 
                        onClick={() => setShowAssignClassDialog(true)}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign to Classes
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                {/* Payment History Tab */}
                <TabsContent value="payments" className="mt-0">
                  {paidStudents > 0 ? (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Payment Timeline</h3>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {(bill.students as StudentBill[])
                          ?.filter((sb: StudentBill) => sb.isPaid && sb.paidAt)
                          .sort((a, b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime())
                          .map((studentBill, idx) => (
                            <div key={studentBill.studentId} className="flex items-start gap-3 pb-4">
                              <div className="mt-0.5 bg-green-100 rounded-full p-1">
                                <Receipt className="h-4 w-4 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <div>
                                    <p className="font-medium">{studentBill.student.firstName} {studentBill.student.lastName}</p>
                                    <p className="text-sm text-gray-500">
                                      {studentBill.student.class?.name || "No Class"} • {formatCurrency(bill.amount)}
                                    </p>
                                  </div>
                                  <p className="text-sm text-gray-500 whitespace-nowrap">
                                    {formatDate(studentBill.paidAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                      
                      <Separator className="my-6" />
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                          <BarChart3 className="h-5 w-5 mr-2" />
                          <span>Payment Analytics</span>
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="bg-gray-50">
                            <CardContent className="pt-6 pb-6">
                              <h4 className="text-base font-medium mb-2">Collection Rate</h4>
                              <div className="flex items-end gap-2">
                                <p className="text-2xl font-bold">{paymentPercentage}%</p>
                                <p className="text-sm text-gray-500 pb-1">of students have paid</p>
                              </div>
                              <Progress value={paymentPercentage} className="h-2 mt-3" />
                            </CardContent>
                          </Card>
                          
                          <Card className="bg-gray-50">
                            <CardContent className="pt-6 pb-6">
                              <h4 className="text-base font-medium mb-2">Amount Collected</h4>
                              <div className="flex items-end gap-2">
                                <p className="text-2xl font-bold">{formatCurrency(collectedAmount)}</p>
                                <p className="text-sm text-gray-500 pb-1">of {formatCurrency(totalAmount)}</p>
                              </div>
                              <Progress 
                                value={totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0} 
                                className="h-2 mt-3" 
                              />
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">No payment history available yet</p>
                      {totalStudents > 0 && (
                        <p className="text-sm text-gray-400 mt-1">
                          {totalStudents} students have been assigned this bill but none have paid
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AssignBillDialog
        isOpen={showAssignClassDialog}
        onClose={() => setShowAssignClassDialog(false)}
        billId={bill.id}
        billTitle={bill.title}
        assignedClasses={bill.class || []}
      />
      
      <RemoveBillFromClassesDialog
        isOpen={showRemoveClassDialog}
        onClose={() => setShowRemoveClassDialog(false)}
        billId={bill.id}
        billTitle={bill.title}
        assignedClasses={bill.class || []}
      />
      
      <ExcludeStudentsDialog
        isOpen={showExcludeStudentDialog}
        onClose={() => setShowExcludeStudentDialog(false)}
        billId={bill.id}
        billTitle={bill.title}
        students={bill.students?.map((s: StudentBill) => ({
          id: s.studentId,
          firstName: s.student.firstName,
          lastName: s.student.lastName,
          className: s.student.class?.name,
          isPaid: s.isPaid
        })) || []}
      />
      
      <IncludeStudentsDialog
        isOpen={showIncludeStudentDialog}
        onClose={() => setShowIncludeStudentDialog(false)}
        billId={bill.id}
        billTitle={bill.title}
      />
    </div>
  );
}