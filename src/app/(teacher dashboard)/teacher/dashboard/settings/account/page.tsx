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
function TeacherAccountSettings() {
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
        const response = await fetch('/api/teacher/profile');
        
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your profile information',
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
    <Card className="w-full max-w-4xl mx-auto p-6">
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <TabsContent value="profile">
              <AccountProfileTab 
                user={user} 
                role="teacher" 
                onUpdate={(updatedUser) => setUser({...user, ...updatedUser})}
              />
            </TabsContent>
            
            <TabsContent value="security">
              <AccountSecurityTab user={user} role="teacher" />
            </TabsContent>
          </>
        )}
      </Tabs>
    </Card>
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