"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { EditStoreItemForm } from "./EditStoreItemForm";
import {
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import DeleteStoreItemDialog from "./DeleteStoreItemDialog";

// Make sure the interface is defined correctly
interface StoreItemCardProps {
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
}

export function StoreItemCard({
  id,
  name,
  emoji,
  price,
  description,
  quantity,
  isAvailable,
  backgroundColor,
  classes = [],
}: StoreItemCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const navigateToStoreItem = () => {
    router.push(`/teacher/dashboard/storefront/${id}`);
  };

  return (
    <>
      <Card
        className={`overflow-hidden w-[250px] h-[250px] relative cursor-pointer hover:shadow-md transition-shadow ${backgroundColor}`}
        onClick={navigateToStoreItem}
      >
        <div
          className="absolute right-2 top-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/20">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Store Item
              </DropdownMenuItem>
              {/* Removed the "Assign to More Classes" option */}
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Store Item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="p-5">
          <div className="flex items-center mb-4">
            <div className="text-3xl mr-3">{emoji}</div>
            <div>
              <h3 className="font-semibold text-lg">{name}</h3>
              <p className="text-2xl font-bold">{formatCurrency(price)}</p>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Quantity:</span> {quantity}
            </p>
            <p>
              <span className="font-medium">Available:</span>{" "}
              {isAvailable ? "Yes" : "No"}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {classes && classes.length > 0 ? (
                classes.slice(0, 3).map((cls: any) => (
                  <span
                    key={cls.id}
                    className="inline-flex items-center text-xs bg-white rounded-full px-2 py-1 border"
                  >
                    <span className="mr-1">{cls.emoji}</span>
                    <span className="truncate max-w-[80px]">{cls.name}</span>
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center text-xs bg-white rounded-full px-2 py-1 border text-gray-500">
                  <span className="mr-1">📝</span>
                  <span>Unassigned</span>
                </span>
              )}

              {classes && classes.length > 3 && (
                <span className="inline-flex items-center text-xs bg-white rounded-full px-2 py-1 border">
                  +{classes.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <EditStoreItemForm
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        itemData={{
          id,
          name,
          emoji,
          price,
          description,
          quantity,
          isAvailable,
        }}
      />

      <DeleteStoreItemDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        storeItemId={id}
        storeItemName={name}
      />
    </>
  );
}
