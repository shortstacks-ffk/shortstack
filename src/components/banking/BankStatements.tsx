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
    { name: "May", abbr: "MAY.", index: 4 },
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
            <SelectTrigger className="w-full sm:w-[180px] border-orange-500 text-orange-500 rounded-xl">
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
            <SelectTrigger className="w-full sm:w-[180px] border-orange-500 text-orange-500 rounded-xl">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {months.map((month) => {
              const disabled = isDisabled(month.index, month.name);
              const isLoading = isDownloading === month.name;
              
              return (
                <div 
                  key={month.abbr}
                  className={`relative w-[140px] h-[125px] mx-auto group ${disabled ? 'opacity-1' : 'cursor-pointer hover:scale-105 transition-all'}`}
                  onClick={() => !disabled && !isLoading && handleDownloadStatement(month.name, month.index)}
                >
                  {/* Main container with proper folder shape */}
                  <div className="w-full h-full relative bg-transparent">
                    {/* Folder back - the dark green part with tab */}
                    <div className="absolute top-0 left-0 w-full h-full">
                      {/* Tab part */}
                      <div 
                        className="absolute top-0 left-0 w-[40px] h-[26px] rounded-xl"
                        style={{ background: '#075D31' }}
                      />
                      
                      
                      {/* Main back part extending to right */}
                      <div 
                        className="absolute top-4 left-[40px] right-0 w-[100px] h-[30px] rounded-xl"
                        style={{ background: '#075D31' }}
                      />



                       <svg className="w-full h-20 rounded-xl" viewBox="0 0 200 40" preserveAspectRatio="none">
                    <path
                      d="M0,0 
                        H50 
                        C70,0 90,30 110,30 
                        H200 
                        V40 
                        H0 
                        Z"
                      fill="#075D31"
                    />
                  </svg>
                    </div>
                    
                    {/* Front folder - the light green part that covers most of the folder */}
                    <div 
                      className="absolute top-[24px] left-0 right-0 bottom-0 rounded-xl"
                      style={{ 
                        background: 'linear-gradient(180deg, #72E2AD 0%, #3FCD89 100%)',
                        boxShadow: 'inset 0px -32px 128px rgba(0, 133, 70, 0.30), inset 0px 6px 8px rgba(255, 255, 255, 0.30)'
                      }}
                    />
                    
                    {/* Shadow only below the folder */}
                    <div className="absolute -bottom-3 left-0 right-0 h-6 rounded-full bg-black/20 blur-md -z-10" />
                    
                    {/* Horizontal line shadows at bottom */}
                    <div className="absolute bottom-[15px] left-0 right-0 h-[1px] bg-gradient-to-b from-black/5 to-transparent" />
                    <div className="absolute bottom-[10px] left-0 right-0 h-[1px] bg-gradient-to-b from-black/5 to-transparent" />
                    <div className="absolute bottom-[5px] left-0 right-0 h-[1px] bg-gradient-to-b from-black/5 to-transparent" />
                    
                    {/* Month text - top left aligned */}
                    <div className="absolute top-[34px] left-[22px] text-left text-white text-2xl font-medium">
                      {month.abbr}
                    </div>
                    
                    {/* Download icon - centered and below month text */}
                    <div className="absolute inset-x-0 bottom-[25px] flex justify-center items-center">
                      {isLoading ? (
                        <Loader2 className="h-10 w-10 text-white animate-spin" />
                      ) : (
                        <Download className="h-10 w-10 text-white" strokeWidth={1.5} />
                      )}
                    </div>
                    
                    {/* Hover overlay for disabled states */}
                    {disabled && (
                      <div className="absolute inset-0 bg-gray-800 bg-opacity-0 rounded-md flex items-center justify-center opacity-0 group-hover:bg-opacity-50 group-hover:opacity-100 transition-all">
                        <div className="bg-white/80 px-3 py-1 rounded-md text-sm font-medium text-gray-800">
                          {parseInt(selectedYear) > currentYear || 
                            (parseInt(selectedYear) === currentYear && month.index > currentMonth) 
                            ? 'Not Available'
                            : 'No Data'}
                        </div>
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