"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { formatCurrency } from "@/src/lib/utils";
import { Minus, Plus, CreditCard, Wallet } from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  quantity: number;
  isAvailable: boolean;
}

interface Account {
  id: string;
  name: string;
  type: "CHECKING" | "SAVINGS";
  balance: number;
  icon: "wallet" | "credit-card";
}

interface PurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: StoreItem | null;
  onConfirmPurchase: (quantity: number, accountId: string) => void;
  purchasing: boolean;
}

export function PurchaseStoreItemDialog({
  isOpen,
  onClose,
  item,
  onConfirmPurchase,
  purchasing,
}: PurchaseDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Fetch student accounts when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchStudentAccounts();
    }
  }, [isOpen]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen && item) {
      setQuantity(1);
      setSelectedAccount("");
    }
  }, [isOpen, item]);

  const fetchStudentAccounts = async () => {
    setLoadingAccounts(true);
    try {
      // Changed from "/api/student/accounts" to "/api/student/storefront/accounts"
      const response = await fetch("/api/student/storefront/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
        // Auto-select checking account if available
        const checkingAccount = data.find((acc: Account) => acc.type === "CHECKING");
        if (checkingAccount) {
          setSelectedAccount(checkingAccount.id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    // Don't validate range during input, just ensure it's positive and within stock
    if (newQuantity >= 1 && newQuantity <= (item?.quantity || 1)) {
      setQuantity(newQuantity);
    }
  };

  const handleConfirm = () => {
    if (selectedAccount && item) {
      onConfirmPurchase(quantity, selectedAccount);
    }
  };

  const totalCost = (item?.price || 0) * quantity;
  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
  const canAfford = selectedAccountData ? selectedAccountData.balance >= totalCost : false;

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            Purchase: 
            <span className="text-2xl mr-2">{item.emoji}</span> {item.name}
          </DialogTitle>
          <DialogDescription>
            Choose the quantity and payment method for your purchase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span>Price:</span>
              <span className="font-bold">{formatCurrency(item.price)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Available:</span>
              <span>{item.quantity} in stock</span>
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                readOnly
                className="w-20 text-center cursor-default"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= item.quantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="account">Payment Account</Label>
            {loadingAccounts ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                <span className="ml-2 text-sm">Loading accounts...</span>
              </div>
            ) : (
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          {account.type === "CHECKING" ? (
                            <Wallet className="h-4 w-4 mr-2" />
                          ) : (
                            <CreditCard className="h-4 w-4 mr-2" />
                          )}
                          <span>{account.name}</span>
                        </div>
                        <span className="ml-4 font-medium">
                          {formatCurrency(account.balance)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Total Cost */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Cost:</span>
              <span className="text-xl font-bold text-blue-600">
                {formatCurrency(totalCost)}
              </span>
            </div>
            {selectedAccountData && (
              <div className="flex justify-between items-center text-sm mt-2">
                <span>Account Balance:</span>
                <span className={canAfford ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(selectedAccountData.balance)}
                </span>
              </div>
            )}
            {selectedAccountData && !canAfford && (
              <div className="text-red-600 text-sm mt-2">
                ⚠️ Insufficient funds for this purchase
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={purchasing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedAccount || !canAfford || purchasing || loadingAccounts}
          >
            {purchasing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              `Purchase ${formatCurrency(totalCost)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}