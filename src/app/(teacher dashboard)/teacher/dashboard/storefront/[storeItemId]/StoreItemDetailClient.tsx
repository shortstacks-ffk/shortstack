"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import Link from "next/link";
import {
  ChevronLeft,
  AlertCircle,
  Users,
  CheckCircle2,
  XCircle,
  CircleDollarSign,
  Plus,
  Minus,
  BookOpen,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import { Progress } from "@/src/components/ui/progress";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import AssignStoreItemDialog from "@/src/components/storefront/AssignStoreItemDialog";
import RemoveStoreItemFromClassesDialog from "@/src/components/storefront/RemoveStoreItemFromClassesDialog";

interface StoreItemClass {
  id: string;
  name: string;
  code: string;
  emoji: string;
}

interface StoreItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  description?: string;
  quantity: number;
  isAvailable: boolean;
  classes: StoreItemClass[];
  purchases?: Array<{
    id: string;
    quantity: number;
    totalPrice: number;
    status: string;
    purchasedAt: string;
    student: {
      id: string;
      firstName: string;
      lastName: string;
      profileImage?: string;
    };
  }>;
}

interface StoreItemDetailClientProps {
  storeItem: StoreItem;
}

export function StoreItemDetailClient({ storeItem }: StoreItemDetailClientProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  // Calculate purchase statistics with proper type safety
  const total = storeItem.quantity || 0;
  const purchased = storeItem.purchases?.reduce(
    (acc, purchase) => acc + (purchase?.quantity || 0), 
    0
  ) || 0;
  
  const remaining = Math.max(total - purchased, 0);
  const percentPurchased = total > 0 ? Math.round((purchased / total) * 100) : 0;

  // Format date for display
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  return (
    <div className="w-full h-full bg-gray-50">
      {/* Fixed header section */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link 
            href="/teacher/dashboard/storefront" 
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Back to Storefront</span>
          </Link>
          
          <div className="flex items-center space-x-3">
            <Badge 
              variant={storeItem.isAvailable ? "default" : "secondary"} 
              className="text-sm"
            >
              {storeItem.isAvailable ? "Available" : "Not Available"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Scrollable content area with consistent background */}
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 space-y-6 pb-8 min-h-full bg-gray-50">
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <span className="text-4xl mr-4">{storeItem.emoji}</span>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{storeItem.name}</h1>
                  <p className="text-gray-600 mt-1">
                    Store Item • {storeItem.isAvailable ? "Available" : "Not Available"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(storeItem.price)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <CircleDollarSign className="h-4 w-4 mr-2" />
                  Price
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(storeItem.price)}</p>
                <p className="text-sm text-gray-500 mt-1">Per item</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Inventory
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between items-center">
                  <p className="text-2xl font-bold text-gray-900">{purchased}/{total}</p>
                  <p className="text-xl font-bold text-gray-500">{percentPurchased}%</p>
                </div>
                <Progress value={percentPurchased} className="h-2 mt-3" />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">{purchased} sold</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-amber-600" />
                    <span className="text-amber-600">{remaining} remaining</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Classes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-gray-900">{storeItem.classes?.length || 0}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {storeItem.classes?.length === 1 ? "class assigned" : "classes assigned"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Section */}
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
                    Classes ({storeItem.classes?.length || 0})
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* Tab Contents */}
              <div className="p-6">
                <TabsContent value="details" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-900">Item Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Name</p>
                          <p className="font-medium text-gray-900">{storeItem.name}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Price</p>
                          <p className="font-medium text-gray-900">{formatCurrency(storeItem.price)}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Total Quantity</p>
                          <p className="font-medium text-gray-900">{storeItem.quantity}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Status</p>
                          <Badge variant={storeItem.isAvailable ? "default" : "secondary"}>
                            {storeItem.isAvailable ? "Available" : "Not Available"}
                          </Badge>
                        </div>
                        <div className="flex justify-between py-2">
                          <p className="text-gray-600">Remaining</p>
                          <p className="font-medium text-gray-900">{remaining}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-900">Sales Summary</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Items Sold</p>
                          <p className="font-medium text-green-600">{purchased}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Sold Percentage</p>
                          <p className="font-medium text-gray-900">{percentPurchased}%</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Total Revenue</p>
                          <p className="font-medium text-green-600">{formatCurrency(purchased * storeItem.price)}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600">Potential Revenue</p>
                          <p className="font-medium text-gray-900">{formatCurrency(total * storeItem.price)}</p>
                        </div>
                        <div className="flex justify-between py-2">
                          <p className="text-gray-600">Classes Assigned</p>
                          <p className="font-medium text-gray-900">{storeItem.classes?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {storeItem.description && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-semibold mb-3 text-gray-900">Description</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{storeItem.description}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Classes Tab */}
                <TabsContent value="classes" className="mt-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Assigned Classes</h3>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowAssignDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign to Classes
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowRemoveDialog(true)}
                        disabled={!storeItem.classes?.length}
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Unassign from Classes
                      </Button>
                    </div>
                  </div>
                  
                  {storeItem.classes && storeItem.classes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {storeItem.classes.map((classItem) => (
                        <div key={classItem.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{classItem.emoji || '📚'}</span>
                            <div>
                              <Link 
                                href={`/teacher/dashboard/classes/${classItem.code}`}
                                className="font-medium text-blue-600 hover:underline"
                              >
                                {classItem.name}
                              </Link>
                              <p className="text-sm text-gray-600">Code: {classItem.code}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">This item is not assigned to any classes</p>
                      <p className="text-sm text-gray-400 mt-1 mb-4">
                        You can assign this item to classes to make it available for students
                      </p>
                      <Button 
                        onClick={() => setShowAssignDialog(true)}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign to Classes
                      </Button>
                    </div>
                  )}
                </TabsContent>

              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AssignStoreItemDialog
        isOpen={showAssignDialog}
        onClose={() => setShowAssignDialog(false)}
        storeItemId={storeItem.id}
        storeItemTitle={storeItem.name}
        assignedClasses={storeItem.classes || []}
      />
      
      <RemoveStoreItemFromClassesDialog
        isOpen={showRemoveDialog}
        onClose={() => setShowRemoveDialog(false)}
        storeItemId={storeItem.id}
        storeItemTitle={storeItem.name}
        assignedClasses={storeItem.classes || []}
      />
    </div>
  );
}