"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/src/hooks/use-toast";
import { Button } from "@/src/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { ShoppingBag, CheckCircle } from "lucide-react"; // Removed AlertCircle, DollarSign
import { formatCurrency } from "@/src/lib/utils";
import { StudentStoreItemCard } from "@/src/components/storefront/StudentStoreItemCard";
import { PurchaseStoreItemDialog } from "@/src/components/storefront/PurchaseStoreItemDialog";

interface StoreItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  description?: string;
  quantity: number;
  isAvailable: boolean;
  class: {
    id: string;
    name: string;
    emoji: string;
  }[];
}

// Removed InsufficientFundsData interface since it's no longer needed

export default function StudentStoreFrontPage() {
  const [loading, setLoading] = useState(true);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  // Removed insufficientFunds state
  const [purchaseSuccess, setPurchaseSuccess] = useState<{
    itemName: string;
    itemEmoji: string;
    newBalance: number;
  } | null>(null);
  const [PurchaseStoreItemDialogOpen, setPurchaseStoreItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  const fetchStoreItems = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/student/storefront");

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error response:", errorText);
        throw new Error(`Failed to fetch store items: ${response.status}`);
      }

      const data = await response.json();
      // Sort alphabetically by name
      const sortedData = data.sort((a: StoreItem, b: StoreItem) => 
        a.name.localeCompare(b.name)
      );
      setStoreItems(sortedData);
    } catch (error) {
      console.error("❌ Client error fetching store items:", error);
      toast({
        title: "Error",
        description: "Failed to load store items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreItems();
  }, [router, toast]);

  const handlePurchaseClick = (item: StoreItem) => {
    setSelectedItem(item);
    setPurchaseStoreItemDialogOpen(true);
  };

  const handleConfirmPurchase = async (quantity: number, accountId: string) => {
    if (!selectedItem) return;

    setPurchasing(selectedItem.id);

    try {
      const response = await fetch("/api/student/storefront/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          itemId: selectedItem.id, 
          quantity,
          accountId 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to purchase item");
      }

      // SUCCESS: Update local state instead of refetching
      setStoreItems(prevItems => 
        prevItems.map(item => 
          item.id === selectedItem.id 
            ? { ...item, quantity: item.quantity - quantity }
            : item
        ).filter(item => item.quantity > 0) // Remove items with 0 quantity
      );

      setPurchaseSuccess({
        itemName: selectedItem.name,
        itemEmoji: selectedItem.emoji,
        newBalance: result.newBalance,
      });

      setPurchaseStoreItemDialogOpen(false);

      toast({
        title: "Purchase Successful! 🎉",
        description: `${selectedItem.emoji} ${selectedItem.name} (${quantity}x) purchased successfully!`,
        duration: 4000,
      });

      // Remove the setTimeout and fetchStoreItems call

    } catch (error) {
      console.error("Error purchasing item:", error);
      toast({
        title: "Purchase Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not complete your purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };


  return (
    <>
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Storefront Items</h1>
          <p className="text-gray-500 mt-1">
            Items available for purchase from your classes
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading store items...</span>
          </div>
        ) : storeItems.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
            <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              No items available
            </h3>
            <p className="mt-2 text-gray-500">
              There are no items available for purchase from your classes right
              now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {storeItems.map((item) => (
              <StudentStoreItemCard
                key={`${item.id}-${item.quantity}`} // Stable key that includes quantity
                id={item.id}
                name={item.name}
                emoji={item.emoji}
                price={item.price}
                description={item.description}
                quantity={item.quantity}
                isAvailable={item.isAvailable}
                backgroundColor="bg-white"
                classes={item.class}
                onPurchaseClick={() => handlePurchaseClick(item)}
                purchasing={purchasing === item.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Purchase Dialog */}
      <PurchaseStoreItemDialog
        isOpen={PurchaseStoreItemDialogOpen}
        onClose={() => {
          setPurchaseStoreItemDialogOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onConfirmPurchase={handleConfirmPurchase}
        purchasing={!!purchasing}
      />

      {/* Success Purchase Dialog */}
      <AlertDialog
        open={!!purchaseSuccess}
        onOpenChange={() => setPurchaseSuccess(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Purchase Successful!
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-center">
                <div className="text-4xl">{purchaseSuccess?.itemEmoji}</div>
                <p className="text-lg font-medium">
                  {purchaseSuccess?.itemName} purchased successfully!
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setPurchaseSuccess(null)}
              className="bg-stone-950 hover:bg-gray-600"
            >
              Great!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
