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
  ShoppingBag,
  Calendar,
  Clock,
  TrendingUp,
  User,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import AssignStoreItemDialog from "@/src/components/storefront/AssignStoreItemDialog";
import RemoveStoreItemFromClassesDialog from "@/src/components/storefront/RemoveStoreItemFromClassesDialog";
import { useResponsive } from '@/src/hooks/use-responsive';

interface StoreItemClass {
  id: string;
  name: string;
  code: string;
  emoji: string;
}

interface Purchase {
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
  purchases?: Purchase[];
}

interface StoreItemDetailClientProps {
  storeItem: StoreItem;
}

export function StoreItemDetailClient({ storeItem }: StoreItemDetailClientProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const { isMobile, isTablet } = useResponsive();

  // Calculate purchase statistics with proper type safety
  const total = storeItem.quantity || 0;
  const purchased = storeItem.purchases?.reduce(
    (acc, purchase) => acc + (purchase?.quantity || 0), 
    0
  ) || 0;
  
  const remaining = Math.max(total - purchased, 0);
  const percentPurchased = total > 0 ? Math.round((purchased / total) * 100) : 0;

  // Purchase analytics
  const purchaseAnalytics = React.useMemo(() => {
    if (!storeItem.purchases?.length) {
      return {
        totalPurchases: 0,
        totalRevenue: 0,
        uniqueStudents: 0,
        averageQuantityPerPurchase: 0,
        recentPurchases: [],
      };
    }

    const purchases = storeItem.purchases;
    const totalPurchases = purchases.length;
    const totalRevenue = purchases.reduce((sum, p) => sum + p.totalPrice, 0);
    const uniqueStudents = new Set(purchases.map(p => p.student.id)).size;
    const averageQuantityPerPurchase = purchases.reduce((sum, p) => sum + p.quantity, 0) / totalPurchases;
    const recentPurchases = purchases
      .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
      .slice(0, 5);

    return {
      totalPurchases,
      totalRevenue,
      uniqueStudents,
      averageQuantityPerPurchase: Math.round(averageQuantityPerPurchase * 10) / 10,
      recentPurchases,
    };
  }, [storeItem.purchases]);

  // Format date for display
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStudentInitials = (student: Purchase['student']) => {
    return `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      PENDING: { variant: "secondary" as const, label: "Pending" },
      COMPLETED: { variant: "default" as const, label: "Completed" },
      CANCELLED: { variant: "destructive" as const, label: "Cancelled" },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.PENDING;
    
    return (
      <Badge variant={statusInfo.variant} className="text-xs">
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <div className="w-full h-full bg-gray-50">
      {/* Fixed header section - responsive */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link 
            href="/teacher/dashboard/storefront" 
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium hidden sm:inline">Back to Storefront</span>
            <span className="text-sm font-medium sm:hidden">Back</span>
          </Link>
          
          <div className="flex items-center space-x-3">
            <Badge 
              variant={storeItem.isAvailable ? "default" : "secondary"} 
              className="text-xs sm:text-sm"
            >
              {storeItem.isAvailable ? "Available" : "Not Available"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Scrollable content area - responsive */}
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 space-y-4 sm:space-y-6 pb-8 min-h-full bg-gray-50">
          {/* Header Section - responsive */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-center w-full sm:w-auto">
                <span className="text-3xl sm:text-4xl mr-3 sm:mr-4 flex-shrink-0">{storeItem.emoji}</span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 break-words">
                    {storeItem.name}
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">
                    Store Item • {storeItem.isAvailable ? "Available" : "Not Available"}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(storeItem.price)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Overview Cards - responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center">
                  <CircleDollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Price
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(storeItem.price)}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Per item</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Inventory
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between items-center">
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{purchased}/{total}</p>
                  <p className="text-base sm:text-xl font-bold text-gray-500">{percentPurchased}%</p>
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
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center">
                  <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Classes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{storeItem.classes?.length || 0}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {storeItem.classes?.length === 1 ? "class assigned" : "classes assigned"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Section - responsive */}
          <div className="bg-white rounded-lg shadow-sm">
            <Tabs defaultValue="details">
              <div className="border-b px-3 sm:px-6 pt-4">
                <TabsList className="w-full justify-start bg-transparent h-auto p-0 flex-wrap gap-2 sm:gap-0 sm:flex-nowrap">
                  <TabsTrigger 
                    value="details" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3 text-sm"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger 
                    value="classes"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3 text-sm"
                  >
                    Classes ({storeItem.classes?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="purchases"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3 text-sm"
                  >
                    Purchases ({storeItem.purchases?.length || 0})
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* Tab Contents */}
              <div className="p-3 sm:p-6">
                <TabsContent value="details" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900">Item Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600 text-sm sm:text-base">Name</p>
                          <p className="font-medium text-gray-900 text-sm sm:text-base text-right">{storeItem.name}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600 text-sm sm:text-base">Price</p>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{formatCurrency(storeItem.price)}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600 text-sm sm:text-base">Total Quantity</p>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{storeItem.quantity}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600 text-sm sm:text-base">Status</p>
                          <Badge variant={storeItem.isAvailable ? "default" : "secondary"}>
                            {storeItem.isAvailable ? "Available" : "Not Available"}
                          </Badge>
                        </div>
                        <div className="flex justify-between py-2">
                          <p className="text-gray-600 text-sm sm:text-base">Remaining</p>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{remaining}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900">Sales Summary</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600 text-sm sm:text-base">Items Sold</p>
                          <p className="font-medium text-green-600 text-sm sm:text-base">{purchased}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600 text-sm sm:text-base">Sold Percentage</p>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{percentPurchased}%</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600 text-sm sm:text-base">Total Revenue</p>
                          <p className="font-medium text-green-600 text-sm sm:text-base">{formatCurrency(purchased * storeItem.price)}</p>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <p className="text-gray-600 text-sm sm:text-base">Potential Revenue</p>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{formatCurrency(total * storeItem.price)}</p>
                        </div>
                        <div className="flex justify-between py-2">
                          <p className="text-gray-600 text-sm sm:text-base">Classes Assigned</p>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{storeItem.classes?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {storeItem.description && (
                    <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-900">Description</h3>
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{storeItem.description}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Classes Tab */}
                <TabsContent value="classes" className="mt-0">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                    <h3 className="text-base sm:text-lg font-semibold">Assigned Classes</h3>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowAssignDialog(true)}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Assign to Classes
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowRemoveDialog(true)}
                        disabled={!storeItem.classes?.length}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Unassign from Classes
                      </Button>
                    </div>
                  </div>
                  
                  {storeItem.classes && storeItem.classes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {storeItem.classes.map((classItem) => (
                        <div key={classItem.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <span className="text-xl sm:text-2xl flex-shrink-0">{classItem.emoji || '📚'}</span>
                            <div className="min-w-0 flex-1">
                              <Link 
                                href={`/teacher/dashboard/classes/${classItem.code}`}
                                className="font-medium text-blue-600 hover:underline text-sm sm:text-base block truncate"
                              >
                                {classItem.name}
                              </Link>
                              <p className="text-xs sm:text-sm text-gray-600">Code: {classItem.code}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                      <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
                      <p className="text-gray-500 text-base sm:text-lg font-medium text-center">This item is not assigned to any classes</p>
                      <p className="text-xs sm:text-sm text-gray-400 mt-1 mb-4 text-center px-4">
                        You can assign this item to classes to make it available for students
                      </p>
                      <Button 
                        onClick={() => setShowAssignDialog(true)}
                        className="mt-2 text-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign to Classes
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Purchases Tab - NEW */}
                <TabsContent value="purchases" className="mt-0">
                  {storeItem.purchases && storeItem.purchases.length > 0 ? (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Purchase Analytics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <Card>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="h-4 w-4 text-blue-600" />
                              <div>
                                <p className="text-lg sm:text-2xl font-bold text-gray-900">{purchaseAnalytics.totalPurchases}</p>
                                <p className="text-xs sm:text-sm text-gray-600">Total Purchases</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <div>
                                <p className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(purchaseAnalytics.totalRevenue)}</p>
                                <p className="text-xs sm:text-sm text-gray-600">Total Revenue</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-purple-600" />
                              <div>
                                <p className="text-lg sm:text-2xl font-bold text-gray-900">{purchaseAnalytics.uniqueStudents}</p>
                                <p className="text-xs sm:text-sm text-gray-600">Unique Students</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-amber-600" />
                              <div>
                                <p className="text-lg sm:text-2xl font-bold text-gray-900">{purchaseAnalytics.averageQuantityPerPurchase}</p>
                                <p className="text-xs sm:text-sm text-gray-600">Avg per Purchase</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Purchase History */}
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900">Purchase History</h3>
                        
                        {/* Mobile: Card layout */}
                        {isMobile ? (
                          <div className="space-y-3">
                            {storeItem.purchases
                              .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
                              .map((purchase) => (
                              <Card key={purchase.id} className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={purchase.student.profileImage || ''} />
                                      <AvatarFallback className="text-xs">
                                        {getStudentInitials(purchase.student)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-sm text-gray-900">
                                        {purchase.student.firstName} {purchase.student.lastName}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {formatDateTime(purchase.purchasedAt)}
                                      </p>
                                    </div>
                                  </div>
                                  {getStatusBadge(purchase.status)}
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-600">Quantity</p>
                                    <p className="font-medium">{purchase.quantity}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Total</p>
                                    <p className="font-medium text-green-600">{formatCurrency(purchase.totalPrice)}</p>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          /* Desktop: Table layout */
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Student</TableHead>
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Total Price</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Purchase Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {storeItem.purchases
                                  .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
                                  .map((purchase) => (
                                  <TableRow key={purchase.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={purchase.student.profileImage || ''} />
                                          <AvatarFallback className="text-xs">
                                            {getStudentInitials(purchase.student)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="font-medium text-sm text-gray-900">
                                            {purchase.student.firstName} {purchase.student.lastName}
                                          </p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{purchase.quantity}</TableCell>
                                    <TableCell className="font-medium text-green-600">
                                      {formatCurrency(purchase.totalPrice)}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                      {formatDateTime(purchase.purchasedAt)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                      <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
                      <p className="text-gray-500 text-base sm:text-lg font-medium text-center">No purchases yet</p>
                      <p className="text-xs sm:text-sm text-gray-400 mt-1 text-center px-4">
                        When students purchase this item, their transactions will appear here
                      </p>
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