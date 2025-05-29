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

// Create a separate component that uses useSearchParams
function AccountSettings() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user) return;
      
      try {
        // Add cache-busting query parameter
        const response = await fetch('/api/student/profile?t=' + new Date().getTime(), {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (status === 'authenticated') {
      fetchUserProfile();
    }
  }, [session, status, toast]);

  return (
    <div className="w-full h-full">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">Profile</h1>
          
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
                <TabsContent value="profile" className="mt-0">
                  <AccountProfileTab 
                    user={user} 
                    role="student"
                    isStudent={true}
                    onUpdate={(updatedUser) => setUser({...user, ...updatedUser})}
                  />
                </TabsContent>
                
                <TabsContent value="security" className="mt-0">
                  <AccountSecurityTab user={user} role="student" isStudent={true} />
                </TabsContent>
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
export default function StudentAccountPage() {
  return (
    <Suspense fallback={<AccountSettingsLoading />}>
      <AccountSettings />
    </Suspense>
  );
}