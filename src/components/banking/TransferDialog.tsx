'use client'

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogHeader
} from "@/src/components/ui/dialog"
import { Button } from "@/src/components/ui/button"
import { ChevronDown, CircleDollarSign, AlertCircle, ArrowDown, PiggyBank } from "lucide-react"

interface Account {
  id: string;
  accountType: string;
  balance: number;
  displayAccountNumber?: string;
}

interface TransferDialogProps {
  isOpen: boolean
  onClose: () => void
  accounts: Account[]
  onTransferComplete: () => void
}

export default function TransferDialog({
  isOpen,
  onClose,
  accounts,
  onTransferComplete
}: TransferDialogProps) {
  const [fromAccount, setFromAccount] = useState("")
  const [toAccount, setToAccount] = useState("")
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'select' | 'amount'>('select')
  const [error, setError] = useState<string | null>(null)
  
  // Selected account objects
  const selectedFromAccount = accounts.find(acc => acc.id === fromAccount)
  const selectedToAccount = accounts.find(acc => acc.id === toAccount)
  
  // Reset dialog state when opened
  useEffect(() => {
    if (isOpen) {
      // Set default values if accounts are available
      if (accounts && accounts.length >= 2) {
        // Find savings and checking accounts
        const savingsAccount = accounts.find(acc => acc.accountType === "SAVINGS")
        const checkingAccount = accounts.find(acc => acc.accountType === "CHECKING")
        
        if (savingsAccount && checkingAccount) {
          setFromAccount(savingsAccount.id)
          setToAccount(checkingAccount.id)
        } else {
          setFromAccount(accounts[0].id)
          setToAccount(accounts[1].id)
        }
      }
      
      setAmount("")
      setIsSubmitting(false)
      setError(null)
      setStep('select')
    }
  }, [isOpen, accounts])

  // Update to account when from account changes to ensure different accounts
  useEffect(() => {
    if (fromAccount && toAccount === fromAccount && accounts.length >= 2) {
      // Find an account that is different from fromAccount
      const otherAccount = accounts.find(acc => acc.id !== fromAccount);
      if (otherAccount) {
        setToAccount(otherAccount.id);
      }
    }
  }, [fromAccount, toAccount, accounts]);
  
  const handleFromAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFromAccount = e.target.value;
    setFromAccount(newFromAccount);
    
    // If to account is the same as new from account, change to account
    if (toAccount === newFromAccount && accounts.length >= 2) {
      const otherAccount = accounts.find(acc => acc.id !== newFromAccount);
      if (otherAccount) {
        setToAccount(otherAccount.id);
      }
    }
  };
  
  const handleToAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newToAccount = e.target.value;
    setToAccount(newToAccount);
    
    // If from account is the same as new to account, change from account
    if (fromAccount === newToAccount && accounts.length >= 2) {
      const otherAccount = accounts.find(acc => acc.id !== newToAccount);
      if (otherAccount) {
        setFromAccount(otherAccount.id);
      }
    }
  };
  
  const handleSubmit = async () => {
    if (!fromAccount || !toAccount || !amount) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/student/banking/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromAccountId: fromAccount,
          toAccountId: toAccount,
          amount: parseFloat(amount)
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Transfer failed');
        return;
      }
      
      toast.success("Transfer successful!");
      onClose();
      
      // Make sure we complete all state updates and dialog closes before refreshing
      setTimeout(() => {
        onTransferComplete();
      }, 100);
      
    } catch (error) {
      console.error("Transfer error:", error);
      setError('Failed to complete transfer');
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleClose = () => {
    onClose();
  }
  
  // Swap from and to accounts
  const swapAccounts = () => {
    setFromAccount(toAccount);
    setToAccount(fromAccount);
  }
  
  const goToNextStep = () => {
    setStep('amount');
  }

  // Function to get appropriate icon based on account type
  // const getAccountIcon = (accountType: string | undefined) => {
  //   if (accountType === "CHECKING") {
  //     return <CircleDollarSign size={16} />;
  //   } else {
  //     return <PiggyBank size={16} />;
  //   }
  // }


  

  const getAccountIcon = (accountType: string | undefined) => {
    if (accountType === "CHECKING") {
      return <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
<rect width="64" height="64" rx="32" fill="#C2E8D0"/>
  <path d="M36.7307 26.322C37.0927 26.7392 37.7243 26.7839 38.1414 26.422C38.5586 26.06 38.6033 25.4284 38.2414 25.0113L36.7307 26.322ZM27.2693 37.678C26.9073 37.2608 26.2758 37.2161 25.8586 37.578C25.4415 37.94 25.3967 38.5716 25.7587 38.9887L27.2693 37.678ZM33 21.4444C33 20.8922 32.5523 20.4444 32 20.4444C31.4477 20.4444 31 20.8922 31 21.4444H33ZM31 42.5555C31 43.1078 31.4477 43.5555 32 43.5556C32.5523 43.5556 33 43.1079 33 42.5556L31 42.5555ZM50 32C50 41.9411 41.9411 50 32 50V52C43.0457 52 52 43.0457 52 32H50ZM32 50C22.0589 50 14 41.9411 14 32H12C12 43.0457 20.9543 52 32 52V50ZM14 32C14 22.0589 22.0589 14 32 14V12C20.9543 12 12 20.9543 12 32H14ZM32 14C41.9411 14 50 22.0589 50 32H52C52 20.9543 43.0457 12 32 12V14ZM32 31C30.421 31 29.0367 30.5715 28.0764 29.9313C27.109 29.2864 26.6667 28.5053 26.6667 27.7778H24.6667C24.6667 29.3821 25.6421 30.7121 26.967 31.5954C28.2988 32.4833 30.0812 33 32 33V31ZM26.6667 27.7778C26.6667 27.0502 27.109 26.2691 28.0764 25.6243C29.0367 24.984 30.421 24.5556 32 24.5556V22.5556C30.0812 22.5556 28.2988 23.0722 26.967 23.9602C25.6421 24.8434 24.6667 26.1735 24.6667 27.7778H26.6667ZM32 24.5556C34.1376 24.5556 35.8741 25.3348 36.7307 26.322L38.2414 25.0113C36.9079 23.4745 34.5509 22.5556 32 22.5556V24.5556ZM32 33C33.579 33 34.9633 33.4285 35.9237 34.0687C36.891 34.7136 37.3334 35.4947 37.3334 36.2222H39.3334C39.3334 34.6179 38.358 33.2879 37.0331 32.4046C35.7012 31.5167 33.9188 31 32 31V33ZM31 21.4444V23.5556H33V21.4444H31ZM31 40.4444L31 42.5555L33 42.5556L33 40.4445L31 40.4444ZM32 39.4444C29.8625 39.4444 28.126 38.6652 27.2693 37.678L25.7587 38.9887C27.0921 40.5255 29.4492 41.4444 32 41.4444L32 39.4444ZM37.3334 36.2222C37.3334 36.9498 36.891 37.7309 35.9237 38.3757C34.9634 39.016 33.5791 39.4444 32 39.4444V41.4444C33.9188 41.4444 35.7012 40.9278 37.0331 40.0398C38.358 39.1566 39.3334 37.8265 39.3334 36.2222H37.3334ZM31 23.5556L31 40.4444L33 40.4444L33 23.5556L31 23.5556Z" fill="#009245"/>
</svg>;
    } else {
      return <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="32" fill="#C2E8D0"/>
  <path fillRule="evenodd" clipRule="evenodd" d="M51 37.4444C51 38.8558 49.8658 40 48.4667 40L15.5333 40C14.1342 40 13 38.8558 13 37.4444V19.5556C13 18.1442 14.1342 17 15.5333 17L48.4667 17C49.8658 17 51 18.1442 51 19.5556V37.4444ZM15.5333 37.4444L48.4667 37.4444V19.5556L15.5333 19.5556V37.4444Z" fill="#009245"/>
  <path fillRule="evenodd" clipRule="evenodd" d="M16 42.5C16 41.6716 16.551 41 17.2308 41H46.7692C47.449 41 48 41.6716 48 42.5C48 43.3284 47.449 44 46.7692 44H17.2308C16.551 44 16 43.3284 16 42.5Z" fill="#009245"/>
  <path fillRule="evenodd" clipRule="evenodd" d="M18 46C18 45.4477 18.5698 45 19.2727 45H44.7273C45.4302 45 46 45.4477 46 46C46 46.5523 45.4302 47 44.7273 47H19.2727C18.5698 47 18 46.5523 18 46Z" fill="#009245"/>
  <path fillRule="evenodd" clipRule="evenodd" d="M32 23.5C29.0545 23.5 26.6667 25.7386 26.6667 28.5C26.6667 31.2614 29.0545 33.5 32 33.5C34.9455 33.5 37.3333 31.2614 37.3333 28.5C37.3333 25.7386 34.9455 23.5 32 23.5ZM24 28.5C24 24.3579 27.5817 21 32 21C36.4183 21 40 24.3579 40 28.5C40 32.6421 36.4183 36 32 36C27.5817 36 24 32.6421 24 28.5Z" fill="#009245"/>
  <path fillRule="evenodd" clipRule="evenodd" d="M43.2857 17C43.9958 17 44.5714 17.5756 44.5714 18.2857C44.5714 19.6497 45.1133 20.9578 46.0777 21.9223C47.0422 22.8867 48.3503 23.4286 49.7143 23.4286C50.4244 23.4286 51 24.0042 51 24.7143C51 25.4244 50.4244 26 49.7143 26C47.6683 26 45.7062 25.1872 44.2595 23.7405C42.8128 22.2938 42 20.3317 42 18.2857C42 17.5756 42.5756 17 43.2857 17Z" fill="#009245"/>
  <path fillRule="evenodd" clipRule="evenodd" d="M20.7143 17C21.4244 17 22 17.5756 22 18.2857C22 19.2988 21.8005 20.3019 21.4128 21.2378C21.0251 22.1738 20.4569 23.0242 19.7405 23.7405C19.0242 24.4569 18.1738 25.0251 17.2378 25.4128C16.3019 25.8005 15.2988 26 14.2857 26C13.5756 26 13 25.4244 13 24.7143C13 24.0042 13.5756 23.4286 14.2857 23.4286C14.9611 23.4286 15.6298 23.2955 16.2538 23.0371C16.8778 22.7786 17.4447 22.3998 17.9223 21.9223C18.3998 21.4447 18.7786 20.8778 19.0371 20.2538C19.2955 19.6298 19.4286 18.9611 19.4286 18.2857C19.4286 17.5756 20.0042 17 20.7143 17Z" fill="#009245"/>
  <path fillRule="evenodd" clipRule="evenodd" d="M44.2595 33.2595C45.7062 31.8128 47.6683 31 49.7143 31C50.4244 31 51 31.5756 51 32.2857C51 32.9958 50.4244 33.5714 49.7143 33.5714C48.3503 33.5714 47.0422 34.1133 46.0777 35.0777C45.1133 36.0422 44.5714 37.3503 44.5714 38.7143C44.5714 39.4244 43.9958 40 43.2857 40C42.5756 40 42 39.4244 42 38.7143C42 36.6683 42.8128 34.7062 44.2595 33.2595Z" fill="#009245"/>
  <path fillRule="evenodd" clipRule="evenodd" d="M13 32.2857C13 31.5756 13.5756 31 14.2857 31C15.2988 31 16.3019 31.1995 17.2378 31.5872C18.1738 31.9749 19.0242 32.5431 19.7405 33.2595C20.4569 33.9758 21.0251 34.8262 21.4128 35.7622C21.8005 36.6981 22 37.7012 22 38.7143C22 39.4244 21.4244 40 20.7143 40C20.0042 40 19.4286 39.4244 19.4286 38.7143C19.4286 38.0389 19.2955 37.3702 19.0371 36.7462C18.7786 36.1222 18.3998 35.5553 17.9223 35.0777C17.4447 34.6002 16.8778 34.2214 16.2538 33.9629C15.6298 33.7045 14.9611 33.5714 14.2857 33.5714C13.5756 33.5714 13 32.9958 13 32.2857Z" fill="#009245"/>
</svg>;
    }
  }






  
  // No accounts available case
  if (!accounts || accounts.length < 2) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Money</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <h2 className="text-xl font-semibold mb-4">No accounts available</h2>
            <p className="text-gray-500 mb-4">
              You need at least two accounts to make a transfer.
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Transfers</DialogTitle>
        </DialogHeader>
        
        {step === 'select' ? (
          <div className="space-y-6 py-4">
            {/* From section */}
            <div className="space-y-2">
              <p className="font-medium text-gray-700">From</p>
              <div className="relative border rounded-full overflow-hidden">
                <select
                  value={fromAccount}
                  onChange={handleFromAccountChange}
                  className="w-full p-4 pl-16 pr-10 bg-white border-0 focus:ring-0 focus:outline-none appearance-none"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountType === "CHECKING" ? "Checkings" : "Savings"} ${account.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedFromAccount?.accountType === "CHECKING" ? 'bg-green-200' : 'bg-green-200'
                  }`}>
                    {getAccountIcon(selectedFromAccount?.accountType)}
                  </div>
                </div>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <ChevronDown size={20} className="text-gray-400" />
                </div>
              </div>
            </div>
            
            {/* Arrow down button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={swapAccounts}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 focus:outline-none"
                aria-label="Swap accounts"
              >
                <ArrowDown size={24} className="text-gray-600" />
              </button>
            </div>
            
            {/* To section */}
            <div className="space-y-2">
              <p className="font-medium text-gray-700">To</p>
              <div className="relative border rounded-full overflow-hidden">
                <select
                  value={toAccount}
                  onChange={handleToAccountChange}
                  className="w-full p-4 pl-16 pr-10 bg-white border-0 focus:ring-0 focus:outline-none appearance-none"
                >
                  {accounts.filter(acc => acc.id !== fromAccount).map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountType === "CHECKING" ? "Checkings" : "Savings"} ${account.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center`}>
                    {getAccountIcon(selectedToAccount?.accountType)}
                  </div>
                </div>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <ChevronDown size={20} className="text-gray-400" />
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-center">
              <Button 
                onClick={goToNextStep}
                className="rounded-full px-6 py-2"
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div>
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-1">From</p>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3`}>
                    {getAccountIcon(selectedFromAccount?.accountType)}
                  </div>
                  <div>
                    <p className="font-medium">{selectedFromAccount?.accountType === "CHECKING" ? "Checkings" : "Savings"}</p>
                    <p className="text-sm text-gray-500">${selectedFromAccount?.balance?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-1">To</p>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedToAccount?.accountType === "CHECKING" ? 'bg-green-100' : 'bg-orange-100'
                  } mr-3`}>
                    {getAccountIcon(selectedToAccount?.accountType)}
                  </div>
                  <div>
                    <p className="font-medium">{selectedToAccount?.accountType === "CHECKING" ? "Checkings" : "Savings"}</p>
                    <p className="text-sm text-gray-500">${selectedToAccount?.balance?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="text-center">
                  <label htmlFor="amount" className="sr-only">Amount</label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center pl-4 text-4xl text-gray-400">
                      $
                    </div>
                    <input
                      id="amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => {
                        // Only allow numbers and a single decimal point
                        const value = e.target.value.replace(/[^\d.]/g, '');
                        // Prevent multiple decimal points
                        const decimalCount = (value.match(/\./g) || []).length;
                        if (decimalCount <= 1) {
                          setAmount(value);
                        }
                      }}
                      className="w-full text-center text-6xl py-4 px-12 border-none focus:ring-0 focus:outline-none"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="mt-4 mb-2 flex items-center justify-center text-red-500 text-sm">
                    <AlertCircle size={16} className="mr-2" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="mt-2 mb-8 relative">
                  <div className="h-2 bg-green-100 rounded-full"></div>
                </div>
                
                <div className="flex justify-center">
                  <Button
                    onClick={handleSubmit}
                    disabled={!amount || isSubmitting || parseFloat(amount) <= 0 || parseFloat(amount) > (selectedFromAccount?.balance || 0)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-full py-3 text-lg"
                  >
                    {isSubmitting ? 
                      "Processing..." : 
                      `Add to ${selectedToAccount?.accountType === "CHECKING" ? "Checkings" : "Savings"}`
                    }
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-center">
              <Button 
                variant="outline"
                onClick={() => setStep('select')}
                disabled={isSubmitting}
                className="rounded-full px-6 mr-2"
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}