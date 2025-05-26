'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { toast } from "sonner";
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Loader2, Upload, ImageIcon } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';


interface AccountProfileTabProps {
  user: any;
  role?: "student" | "teacher";
  isStudent?: boolean;
  onUpdate?: (updatedUser: any) => void;
}

const teacherProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  institution: z.string().optional(),
  bio: z.string().optional(),
});

const studentProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  schoolEmail: z.string().email('Invalid email format'),
});

export default function AccountProfileTab({ 
  user, 
  role, 
  isStudent: propIsStudent,
  onUpdate 
}: AccountProfileTabProps) {
  const { data: session, update: updateSession } = useSession();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Determine if the user is a student based on either prop
  const isStudent = propIsStudent !== undefined ? propIsStudent : role === "student";
  
  // Ensure we're properly prioritizing profile images
  const [imagePreview, setImagePreview] = useState<string | null>(() => {
    // First check for user profile image specific to the role
    if (isStudent && user?.profileImage) return user.profileImage;
    if (!isStudent && user?.image) return user.image;
    
    // Then check other possible locations
    return user?.profileImage || user?.image || null;
  });

  const validationSchema = isStudent ? studentProfileSchema : teacherProfileSchema;

  // Initialize form with correct default values based on role
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(validationSchema),
    values: isStudent 
      ? {
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          schoolEmail: user?.schoolEmail || '',
        }
      : {
          firstName: user?.firstName || user?.teacherProfile?.firstName || '',
          lastName: user?.lastName || user?.teacherProfile?.lastName || '',
          email: user?.email || '',
          institution: user?.institution || user?.teacherProfile?.institution || '',
          bio: user?.bio || user?.teacherProfile?.bio || '',
        },
    // Use values instead of defaultValues to ensure form updates when user data changes
  });
  
  // Add useEffect to reset form when user data changes
  useEffect(() => {
    if (user) {
      reset(isStudent 
        ? {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            schoolEmail: user?.schoolEmail || '',
          }
        : {
            firstName: user?.firstName || user?.teacherProfile?.firstName || '',
            lastName: user?.lastName || user?.teacherProfile?.lastName || '',
            email: user?.email || '',
            institution: user?.institution || user?.teacherProfile?.institution || '',
            bio: user?.bio || user?.teacherProfile?.bio || '',
          }
      );
    }
  }, [user, reset, isStudent]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Image must be less than 5MB"
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error("Invalid file type", {
        description: "Please select an image file (.jpg, .png, etc)"
      });
      return;
    }

    // Show immediate preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = isStudent
        ? '/api/student/profile/image'
        : '/api/teacher/profile/image';

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await res.json();
      
      // Update local state to ensure UI reflects change
      setImagePreview(data.imageUrl);
      
      // Force a session refresh to update the avatar
      await updateSession({ 
        image: data.imageUrl,
        // Keep other session data
        ...session?.user
      });
      
      // Update this toast call to use method syntax
      toast.success("Profile image updated", {
        description: "Image uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Failed to update profile image"
      });
      // Reset preview on error
      setImagePreview(user?.profileImage || user?.image || null);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    
    try {
      const endpoint = isStudent
        ? '/api/student/profile'
        : '/api/teacher/profile';
        
      // For teacher profiles, ensure we're sending the institution and bio fields
      const payload = isStudent 
        ? data 
        : {
            firstName: data.firstName,
            lastName: data.lastName,
            institution: data.institution,
            bio: data.bio,
          };
        
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      toast.success("Profile updated", {
        description: "Your profile information has been saved successfully"
      });
      
      // Update session context if name changed
      if (data.firstName && data.lastName) {
        await updateSession({
          name: `${data.firstName} ${data.lastName}`
        });
      }

      // Notify parent component about the update
      if (onUpdate && res.ok) {
        onUpdate(payload);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : "An error occurred while updating your profile"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left side - Personal details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-gray-600">First Name</Label>
              <Input
                id="firstName"
                {...register('firstName')}
                disabled={isStudent}
                className={`border-gray-300 ${isStudent ? 'bg-gray-50' : ''}`}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName.message as string}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-gray-600">Last Name</Label>
              <Input
                id="lastName"
                {...register('lastName')}
                disabled={isStudent}
                className={`border-gray-300 ${isStudent ? 'bg-gray-50' : ''}`}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName.message as string}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={isStudent ? "schoolEmail" : "email"} className="text-gray-600">Email</Label>
            <Input
              id={isStudent ? "schoolEmail" : "email"}
              {...register(isStudent ? "schoolEmail" : "email")}
              disabled
              className="bg-gray-50 border-gray-300"
            />
            {isStudent ? 
              <p className="text-xs text-gray-500">Contact your teacher to update your email address.</p>
              :
              <p className="text-xs text-gray-500">To change your email, please contact support.</p>
            }
          </div>
          
          {!isStudent && (
            <>
              <div className="space-y-2">
                <Label htmlFor="institution" className="text-gray-600">Institution</Label>
                <Input
                  id="institution"
                  {...register('institution')}
                  placeholder="Enter your school or institution"
                  className="border-gray-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-gray-600">Bio</Label>
                <Textarea
                  id="bio"
                  {...register('bio')}
                  placeholder="Tell your students a bit about yourself"
                  className="min-h-[100px] border-gray-300"
                />
              </div>
            </>
          )}
        </div>
        
        {/* Right side - Photo upload */}
        <div className="flex flex-col items-center">
          <div className="border border-gray-300 shadow-sm rounded-lg p-1 w-full max-w-[180px] h-[180px] mb-2 flex items-center justify-center overflow-hidden">
            {imagePreview ? (
              <img 
                src={imagePreview} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <ImageIcon size={40} />
              </div>
            )}
          </div>
          
          <Label htmlFor="profile-image" className="cursor-pointer mt-2">
            <div className="inline-flex items-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-gray-700 text-sm">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{uploading ? 'Uploading...' : 'Add Photo'}</span>
            </div>
            <Input 
              id="profile-image" 
              type="file" 
              className="hidden" 
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </Label>
        </div>
      </div>
      
      <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
        <Button 
          type="submit" 
          disabled={saving || !isDirty || isStudent}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}