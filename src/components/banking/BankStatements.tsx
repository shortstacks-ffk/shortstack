'use client'

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { toast } from "sonner"
import { Download, Calendar, AlertCircle, Loader2 } from "lucide-react"

interface BankStatementsProps {
  accounts: any[]
}

export default function BankStatements({ accounts }: BankStatementsProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [availableStatements, setAvailableStatements] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  
  // Ensure accounts are unique by ID and type
  const uniqueAccounts = accounts.reduce((acc: any[], current) => {
    // Check if we already have an account of this type
    const exists = acc.find(item => item.accountType === current.accountType);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);
  
  // Set initial account if one exists
  useEffect(() => {
    if (uniqueAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(uniqueAccounts[0].id);
    }
  }, [uniqueAccounts, selectedAccountId]);
  
  // Available years - current year and future (2025+)
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear+1, currentYear+2].map(year => year.toString());
  
  // Fetch available statements when account or year changes
  useEffect(() => {
    const fetchAvailableStatements = async () => {
      if (!selectedAccountId) return;
      
      setIsLoading(true);
      
      try {
        const response = await fetch(`/api/student/banking/available-statements?accountId=${selectedAccountId}&year=${selectedYear}`);
        
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
        setIsLoading(false);
      }
    };
    
    if (selectedAccountId) {
      fetchAvailableStatements();
    }
  }, [selectedAccountId, selectedYear]);
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth(); // 0-11
  
  // Months for statements
  const months = [
    { name: "January", abbr: "JAN.", index: 0 },
    { name: "February", abbr: "FEB.", index: 1 },
    { name: "March", abbr: "MAR.", index: 2 },
    { name: "April", abbr: "APR.", index: 3 },
    { name: "May", abbr: "MAY", index: 4 },
    { name: "June", abbr: "JUN.", index: 5 },
    { name: "July", abbr: "JUL.", index: 6 },
    { name: "August", abbr: "AUG.", index: 7 },
    { name: "September", abbr: "SEP.", index: 8 },
    { name: "October", abbr: "OCT.", index: 9 },
    { name: "November", abbr: "NOV.", index: 10 },
    { name: "December", abbr: "DEC.", index: 11 }
  ]
  
  const handleDownloadStatement = async (month: string, monthIndex: number) => {
    if (!selectedAccountId || isDownloading) return;
    
    const selectedYearNum = parseInt(selectedYear);
    
    // Check if the month is in the future or current month
    if (selectedYearNum > currentYear || 
        (selectedYearNum === currentYear && monthIndex > currentMonth)) {
      toast.error(`Statement for ${month} ${selectedYear} is not yet available`);
      return;
    }
    
    // If we know this statement isn't available, show a toast
    if (!availableStatements[month]) {
      toast.error(`No statement available for ${month} ${selectedYear}`);
      return;
    }
    
    setIsDownloading(month);
    
    try {
      // First try to get the statement ID
      const response = await fetch(`/api/student/banking/statement-id?accountId=${selectedAccountId}&month=${month}&year=${selectedYear}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.statementId) {
          // Use the universal download endpoint
          const downloadUrl = `/api/banking/statements/download?id=${data.statementId}`;
          
          // Create a temporary link element and trigger download
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `${month}_${selectedYear}_Statement.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          toast.success(`${month} ${selectedYear} Statement downloaded successfully`);
        } else {
          toast.error(`No statement available for ${month} ${selectedYear}`);
        }
      } else {
        throw new Error("Failed to get statement information");
      }
    } catch (error) {
      console.error("Error downloading statement:", error);
      toast.error("Failed to download statement");
    } finally {
      setIsDownloading(null);
    }
  }
  
  // Helper to determine if a folder should be greyed out
  const isDisabled = (monthIndex: number, monthName: string) => {
    const selectedYearNum = parseInt(selectedYear);
    
    // Future dates are always disabled
    const isFuture = selectedYearNum > currentYear || 
      (selectedYearNum === currentYear && monthIndex > currentMonth);
      
    // Check if statement exists (not disabled if it exists)
    const statementExists = availableStatements[monthName] === true;
    
    return isFuture || !statementExists;
  }
  
  const getAccountName = (accountId: string) => {
    const account = uniqueAccounts.find(acc => acc.id === accountId);
    return account?.accountType === "CHECKING" ? "Checking" : "Savings";
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="w-full sm:w-auto">
          <Select 
            value={selectedAccountId} 
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger className="w-full sm:w-[180px] border-orange-500 text-orange-500">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {uniqueAccounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.accountType === "CHECKING" ? "Checking" : "Savings"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full sm:w-auto">
          <Select 
            value={selectedYear} 
            onValueChange={setSelectedYear}
          >
            <SelectTrigger className="w-full sm:w-[180px] border-orange-500 text-orange-500">
              <SelectValue placeholder={selectedYear} />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {months.map((month) => {
              const disabled = isDisabled(month.index, month.name);
              const isLoading = isDownloading === month.name;
              const statusColor = disabled ? 'text-gray-400' : 'text-green-700';
              
              return (
                <div 
                  key={month.abbr}
                  className={`border rounded-lg overflow-hidden ${disabled ? 'opacity-50' : 'hover:shadow-md transition-all cursor-pointer'}`}
                  onClick={() => !disabled && !isLoading && handleDownloadStatement(month.name, month.index)}
                >
                  <div className={`bg-green-50 border-b p-3 flex items-center justify-between`}>
                    <div className="flex items-center">
                      <Calendar className={`h-5 w-5 ${statusColor} mr-2`} />
                      <div className="font-medium truncate">{month.name}</div>
                    </div>
                    <div className="text-xs text-gray-500">{selectedYear}</div>
                  </div>
                  
                  <div className="p-4">
                    <div className="text-sm text-gray-600 mb-2">
                      {getAccountName(selectedAccountId)} Statement
                    </div>
                    
                    {disabled ? (
                      <div className="flex items-center text-xs text-amber-600 mt-2">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {parseInt(selectedYear) > currentYear || 
                          (parseInt(selectedYear) === currentYear && month.index > currentMonth) 
                          ? 'Not yet available'
                          : 'No transactions'}
                      </div>
                    ) : (
                      <div className="flex justify-end mt-2">
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        ) : (
                          <Download className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="text-center text-xs text-gray-500 mt-4">
            Statements are generated on the 27th of each month
          </div>
        </>
      )}
    </div>
  );
}