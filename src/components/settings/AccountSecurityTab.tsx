'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/src/hooks/use-toast';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Loader2, ShieldAlert, Key } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/src/components/ui/alert';
import { useSession } from 'next-auth/react';

interface AccountSecurityTabProps {
  user: any;
  role?: "student" | "teacher";
  isStudent?: boolean;
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function AccountSecurityTab({ 
  user, 
  role, 
  isStudent: propIsStudent 
}: AccountSecurityTabProps) {
  // Determine if the user is a student based on either prop
  const isStudent = propIsStudent !== undefined ? propIsStudent : role === "student";

  const { data: session } = useSession();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: PasswordFormValues) => {
    setIsSubmitting(true);
    
    try {
      const endpoint = isStudent
        ? '/api/student/password'
        : '/api/teacher/password';
        
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to update password');
      }

      // Send email notification
      if (session?.user?.email) {
        try {
          await fetch('/api/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: session.user.email,
              firstName: session.user.name?.split(' ')[0] || 'User',
              lastName: session.user.name?.split(' ')[1] || '',
              className: isStudent ? 'your classes' : 'your account',
              classCode: 'N/A', // Not applicable for password changes
              isNewStudent: false,
              isPasswordReset: true,
              // We don't include the new password in the email for security reasons
            }),
          });
        } catch (emailError) {
          console.error('Failed to send password notification email:', emailError);
          // We don't want to fail the password change if only the email fails
        }
      }

      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully',
      });

      reset();
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        variant: 'destructive',
        title: 'Password update failed',
        description: error instanceof Error ? error.message : 'An error occurred while updating your password',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <ShieldAlert className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Password Security</AlertTitle>
          <AlertDescription className="text-blue-700">
            Choose a strong password that you don't use for other websites.
          </AlertDescription>
        </Alert>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-gray-600">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                {...register('currentPassword')}
                autoComplete="current-password"
                className="border-gray-300"
              />
              {errors.currentPassword && (
                <p className="text-sm text-red-600">{errors.currentPassword.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-gray-600">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                {...register('newPassword')}
                autoComplete="new-password"
                className="border-gray-300"
              />
              {errors.newPassword && (
                <p className="text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-600">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                autoComplete="new-password"
                className="border-gray-300"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Updating...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-gray-700">Password Requirements</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <Key className="h-4 w-4 text-gray-500" />
            <span>At least 8 characters</span>
          </li>
          <li className="flex items-center gap-2">
            <Key className="h-4 w-4 text-gray-500" />
            <span>At least one uppercase letter</span>
          </li>
          <li className="flex items-center gap-2">
            <Key className="h-4 w-4 text-gray-500" />
            <span>At least one lowercase letter</span>
          </li>
          <li className="flex items-center gap-2">
            <Key className="h-4 w-4 text-gray-500" />
            <span>At least one number</span>
          </li>
        </ul>
      </div>
    </div>
  );
}