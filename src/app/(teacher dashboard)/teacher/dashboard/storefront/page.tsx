export const dynamic = 'force-dynamic';

import { getAllStoreItems } from "@/src/app/actions/storeFrontActions";
import { StoreItemCard } from "@/src/components/storefront/StoreItemCard";
import AddAnything from "@/src/components/AddAnything";
import AddStoreItem from "@/src/components/storefront/AddStoreItem";
import { Suspense } from "react";

interface ItemClass {
  id: string;
  name: string;
  emoji?: string;
  code?: string;
}

// StoreItems content component to handle data fetching
async function StoreItemsContent() {
  const getColumnColor = (index: number) => {
    switch (index % 3) {
      case 0: return "bg-blue-100";
      case 1: return "bg-green-100";
      case 2: return "bg-yellow-100";
      default: return "bg-blue-100";
    }
  };
  
  const response = await getAllStoreItems({ includeUnassigned: true });
  if (!response.success || !response.data) {
    return <div>Failed to load storeItems</div>;
  }

  // Reverse the array so newest items are at the beginning
  const sortedStoreItems = [...response.data].reverse();

  console.log("Store items:", sortedStoreItems.length); // Debug

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {sortedStoreItems.map((storeItem, index) => (
        <StoreItemCard
          key={storeItem.id}
          {...storeItem}
          isAvailable={storeItem.isAvailable}
          classes={storeItem.classes || []} // Fix: Changed from storeItem.class to storeItem.classes
          backgroundColor={getColumnColor(index)}
        />
      ))}
      <AddAnything title="Add Store Item" FormComponent={AddStoreItem} />
    </div>
  );
}

export default async function StoreFrontPage() {
  return (
    <div className="w-full p-4">
      <Suspense
        fallback={
          <div className="text-center py-8">Loading store items...</div>
        }
      >
        <StoreItemsContent />
      </Suspense>
    </div>
  );
}