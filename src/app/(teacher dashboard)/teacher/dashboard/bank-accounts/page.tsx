"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Eye, RefreshCw, Search, Calendar } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
} from "@/src/components/ui/card";

import { Input } from "@/src/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Checkbox } from "@/src/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { formatCurrency } from "@/src/lib/utils";
import { toast } from "sonner";

import AddFundsDialog from "./AddFundsDialog";
import RemoveFundsDialog from "./RemoveFundsDialog";
import RecurringTransactionsDialog from "./RecurringTransactionsDialog";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  lastLogin: string;
  checking: {
    id: string;
    accountNumber: string;
    balance: number;
  };
  savings: {
    id: string;
    accountNumber: string;
    balance: number;
  };
}

// Create a component that uses useSearchParams
function BankAccountsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [isRemoveFundsOpen, setIsRemoveFundsOpen] = useState(false);
  const [isRecurringTransactionsOpen, setIsRecurringTransactionsOpen] = useState(false);

  // Fetch teacher's classes
  useEffect(() => {
    async function fetchClasses() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/teacher/classes");
        if (response.ok) {
          const data = await response.json();
          setClasses(data);
          
          // First check if saved class ID exists in current classes
          const savedClassId = localStorage.getItem('selectedClass');
            const classExists: boolean = savedClassId && data.some((cls: { id: string; name: string }) => cls.id === savedClassId);
          
          if (classExists) {
            setSelectedClass(savedClassId!);
          } else if (data.length > 0) {
            // If not, select the first available class
            const classToSelect = data[0].id;
            setSelectedClass(classToSelect);
            localStorage.setItem('selectedClass', classToSelect);
          }
        } else {
          console.error("Failed to fetch classes:", await response.text());
          toast.error("Failed to load classes");
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
        toast.error("Error loading classes");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchClasses();
  }, []);

  // Update localStorage when class changes
  useEffect(() => {
    if (selectedClass) {
      localStorage.setItem('selectedClass', selectedClass);
    }
  }, [selectedClass]);

  // Fetch students when class is selected
  useEffect(() => {
    async function fetchStudents() {
      if (!selectedClass) return;
      
      setIsLoading(true);
      try {
        console.log("Fetching students for class:", selectedClass);
        const response = await fetch(`/api/teacher/classes/${selectedClass}/students/accounts`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch students:", errorText);
          
          // If the class doesn't exist or access is denied, reset the class selection
          if (errorText.includes("Class not found") || errorText.includes("access denied")) {
            // Clear invalid class from localStorage
            localStorage.removeItem('selectedClass');
            
            // Refetch classes to get a valid selection
            const classesResponse = await fetch("/api/teacher/classes");
            if (classesResponse.ok) {
              const classes = await classesResponse.json();
              if (classes.length > 0) {
                const newClassId = classes[0].id;
                setSelectedClass(newClassId);
                localStorage.setItem('selectedClass', newClassId);
                toast.info("Switched to another available class");
              } else {
                setSelectedClass("");
                toast.error("No classes available");
              }
            }
          } else {
            toast.error("Failed to load student accounts");
          }
          return;
        }
        
        const data = await response.json();
        setStudents(data);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error("Error loading student accounts");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchStudents();
  }, [selectedClass]);

  // Filter students based on search query
  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || 
           student.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Handle selecting all students
  const handleSelectAll = (checked: CheckedState) => {
    if (checked === true) { 
      setSelectedStudents(filteredStudents.map(student => student.id)); 
    } else {
      setSelectedStudents([]);
    }
  };

  // Handle selecting individual student
  const handleSelectStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  // View student transactions
  const viewStudentTransactions = (studentId: string) => {
    router.push(`/teacher/dashboard/bank-accounts/${studentId}`);
  };

  // Refresh student accounts
  const refreshAccounts = async () => {
    if (!selectedClass) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/teacher/classes/${selectedClass}/students/accounts`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
        toast.success("Accounts refreshed", {
          description: "Student account information has been updated."
        });
      }
    } catch (error) {
      console.error("Error refreshing accounts:", error);
      toast.error("Refresh failed", {
        description: "Could not update student accounts."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 overflow-auto">
        <div className="w-full bg-gray-50 pb-8">
          <p className="text-gray-500 mb-4">
            View and manage student bank accounts for your classes
          </p>
          
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:items-center md:justify-between mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-4 w-full md:w-auto">
              <div className="w-full sm:w-48 md:w-64">
                <Select
                  value={selectedClass}
                  onValueChange={(value) => {
                    setSelectedClass(value);
                    setSelectedStudents([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search students..."
                  className="pl-9 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Button
                size="icon"
                variant="outline"
                onClick={refreshAccounts}
                disabled={isLoading}
                className="shrink-0" 
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <Button 
                variant="outline" 
                onClick={() => setIsAddFundsOpen(true)}
                disabled={selectedStudents.length === 0}
              >
                Add Funds
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsRemoveFundsOpen(true)}
                disabled={selectedStudents.length === 0}
              >
                Remove Funds
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsRecurringTransactionsOpen(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Recurring
              </Button>
            </div>
          </div>
          
          <Card className="min-h-auto w-full overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <table className="w-full">
                  <thead>
                    <tr className="bg-orange-500 text-white">
                      <th className="p-1 md:p-2 text-left w-10">
                        <Checkbox 
                          checked={
                            filteredStudents.length > 0 && 
                            selectedStudents.length === filteredStudents.length
                          }
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all students"
                        />
                      </th>
                      <th className="p-1 md:p-2 text-left">Name</th>
                      <th className="hidden sm:table-cell p-1 md:p-2 text-left">E-mail</th>
                      <th className="hidden md:table-cell p-2 md:p-3 text-left">Last Login</th>
                      <th className="p-1 md:p-2 text-center">Checking</th>
                      <th className="p-1 md:p-2 text-center">Savings</th>
                      <th className="p-1 md:p-2 text-center">View Account</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <div className="flex justify-center">
                            <div className="animate-spin h-10 w-10 rounded-full border-4 border-orange-500 border-t-transparent"></div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center">
                          No students found
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => (
                        <tr key={student.id} className="border-t hover:bg-gray-50">
                          <td className="p-2 md:p-3">
                            <Checkbox 
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={(checked) => { 
                                if (checked) {
                                  setSelectedStudents([...selectedStudents, student.id]);
                                } else {
                                  setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                                }
                              }}
                              aria-label={`Select student ${student.firstName} ${student.lastName}`}
                            />
                          </td>
                          <td className="p-2 md:p-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs sm:text-sm">
                                {student.firstName.charAt(0) + student.lastName.charAt(0)}
                              </div>
                              <span className="text-sm sm:text-base">{student.firstName} {student.lastName}</span>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell p-2 md:p-3 text-sm">
                            {student.email}
                          </td>
                          <td className="hidden md:table-cell p-2 md:p-3 text-sm">
                            {student.lastLogin}
                          </td>
                          <td className="p-2 md:p-3 text-center text-sm">
                            {formatCurrency(student.checking.balance)}
                          </td>
                          <td className="p-2 md:p-3 text-center text-sm">
                            {formatCurrency(student.savings.balance)}
                          </td>
                          <td className="p-2 md:p-3">
                            <div className="flex justify-center gap-1 sm:gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => viewStudentTransactions(student.id)}
                                title="View account details"
                                className="h-10 w-10 sm:h-8 sm:w-8"
                              >
                                <Eye className="h-6 w-6 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddFundsDialog
        open={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
        selectedStudents={students.filter(s => selectedStudents.includes(s.id))}
        onComplete={refreshAccounts}
      />

      <RemoveFundsDialog
        open={isRemoveFundsOpen}
        onClose={() => setIsRemoveFundsOpen(false)}
        selectedStudents={students.filter(s => selectedStudents.includes(s.id))}
        onComplete={refreshAccounts}
      />

      <RecurringTransactionsDialog
        open={isRecurringTransactionsOpen}
        onClose={() => setIsRecurringTransactionsOpen(false)}
        students={students}
        onComplete={refreshAccounts}
      />
    </div>
  );
}

// Loading fallback component
function LoadingBankAccounts() {
  return (
    <div className="flex flex-col h-full items-center justify-center">
      <div className="animate-spin h-10 w-10 rounded-full border-4 border-orange-500 border-t-transparent"></div>
      <p className="mt-4 text-gray-500">Loading bank accounts...</p>
    </div>
  );
}

// Main component that wraps content with Suspense
export default function BankAccountsPage() {
  return (
    <Suspense fallback={<LoadingBankAccounts />}>
      <BankAccountsContent />
    </Suspense>
  );
}
