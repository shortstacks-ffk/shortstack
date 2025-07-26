"use client";

import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { AlertCircle } from "lucide-react";
import { formatCurrency } from "@/src/lib/utils";

// Make sure the interface matches the StoreItemCard
interface StudentStoreItemCardProps {
  id: string;
  name: string;
  emoji: string;
  price: number;
  description?: string;
  quantity: number;
  isAvailable: boolean;
  backgroundColor: string;
  classes?: Array<{
    id: string;
    name: string;
    emoji?: string;
    code?: string;
  }>;
  onPurchaseClick?: () => void; // Purchase handler
  purchasing?: boolean; // Loading state for purchase
}

export function StudentStoreItemCard({
  id,
  name,
  emoji,
  price,
  description,
  quantity,
  isAvailable,
  backgroundColor,
  classes = [],
  onPurchaseClick,
  purchasing = false,
}: StudentStoreItemCardProps) {
  return (
    <Card
      className={`overflow-hidden w-[250px] h-[250px] relative transition-shadow ${backgroundColor}`}
    >
      {/* Main content area - not clickable */}
      <div className="p-5">
        <div className="flex items-center mb-4">
          <div className="text-3xl mr-3">{emoji}</div>
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(price)}
            </p>
          </div>
        </div>

        {description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {description}
          </p>
        )}

        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">Quantity:</span> {quantity}
          </p>
        </div>
        

        <div className="space-y-2">
          {/* Status indicators */}
          <div className="h-5 flex items-center">
            {quantity < 5 && quantity > 0 && (
              <div className="flex items-center text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                <span>Only {quantity} left!</span>
              </div>
            )}
            {quantity === 0 && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                <span>Out of stock</span>
              </div>
            )}
            {!isAvailable && (
              <div className="flex items-center text-gray-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                <span>Currently unavailable</span>
              </div>
            )}
          </div>

          </div>
          {/* Purchase button - ONLY clickable element */}
          <Button
            className="w-full mt-16 cursor-pointer"
            onClick={onPurchaseClick}
            disabled={quantity === 0 || !isAvailable || purchasing}
            variant={quantity === 0 || !isAvailable ? "secondary" : "default"}
          >
            {purchasing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : quantity === 0 ? (
              "Out of Stock"
            ) : !isAvailable ? (
              "Unavailable"
            ) : (
              "Purchase"
            )}
          </Button>
        </div>
      
    </Card>
  );
}
