'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/src/components/ui/tabs';
import { Card } from '@/src/components/ui/card';
import { useToast } from '@/src/hooks/use-toast';
import { Loader2 } from 'lucide-react';

import AccountProfileTab from '@/src/components/settings/AccountProfileTab';
import AccountSecurityTab from '@/src/components/settings/AccountSecurityTab';
import SuperUserBadge from "@/src/components/SuperUserBadge";

// Create a separate component that uses useSearchParams
function TeacherAccountSettings() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  
  const { data: session, status, update: updateSession } = useSession();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Add state to track profile updates
  const [profileUpdatedCount, setProfileUpdatedCount] = useState(0);
  
  // Function to fetch user profile
  const fetchUserProfile = async () => {
    if (!session?.user) return;

    try {
      // Use the correct API endpoint for teacher profiles with cache-busting
      const response = await fetch(`/api/teacher/profile?t=${new Date().getTime()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setUser(data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your profile information',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile on session change
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserProfile();
    }
  }, [status, profileUpdatedCount]); // Add profileUpdatedCount to trigger re-fetch

  // Handle profile updates
  const handleProfileUpdate = async (updatedUser: any) => {
    // Update the local state
    interface User {
      profileImage?: string;
      firstName?: string;
      lastName?: string;
      [key: string]: any; // For other potential properties
    }

    // Update the local state
    setUser((prev: User | null): User => ({...(prev || {}), ...updatedUser}));
    
    // Increment the counter to trigger re-fetch
    setProfileUpdatedCount(count => count + 1);
    
    // Update the session
    if (updatedUser.profileImage || updatedUser.firstName || updatedUser.lastName) {
      await updateSession({
        ...session?.user,
        name: `${updatedUser.firstName} ${updatedUser.lastName}`,
        image: updatedUser.profileImage || (session?.user as any).image
      });
    }
    
    // Also notify the parent layout to update the dropdown
    // We'll use localStorage to communicate with the layout
    localStorage.setItem('profileUpdated', String(Date.now()));
    
    // Create and dispatch a custom event
    const event = new CustomEvent('profileUpdated', { 
      detail: { 
        timestamp: Date.now(),
        image: updatedUser.profileImage
      } 
    });
    window.dispatchEvent(event);
  };

  const isSuperUser = session?.user?.role === "SUPER";
  
  return (
    <div className="w-full h-full">
      <div className="flex items-center mb-4">
        <h1 className="text-xl md:text-2xl font-bold">Profile</h1>
        {isSuperUser && <SuperUserBadge />}
      </div>
      
      {isSuperUser && (
        <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800">
            <strong>Administrator Account</strong> - Changes made here will affect your administrator profile.
          </p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm border">
        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="w-full border-b flex justify-start h-auto p-0 bg-transparent space-x-8">
            <TabsTrigger 
              value="profile" 
              className="px-3 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none"
            >
              Account
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="px-3 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none"
            >
              Security
            </TabsTrigger>
          </TabsList>
          
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <>
                <TabsContent value="profile" className="mt-0">
                  <AccountProfileTab 
                    user={user} 
                    role="teacher" 
                    isStudent={false}
                    onUpdate={handleProfileUpdate}
                  />
                </TabsContent>
                
                <TabsContent value="security" className="mt-0">
                  <AccountSecurityTab user={user} role="teacher" isStudent={false}/>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// Loading fallback component
function AccountSettingsLoading() {
  return (
    <Card className="w-full max-w-4xl mx-auto p-6">
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading account settings...</span>
      </div>
    </Card>
  );
}

// Main component wrapped with Suspense
export default function TeacherAccountPage() {
  return (
    <Suspense fallback={<AccountSettingsLoading />}>
      <TeacherAccountSettings />
    </Suspense>
  );
}