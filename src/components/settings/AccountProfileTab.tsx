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

// Super user schema (similar to teacher but without institution/bio requirements)
const superUserProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
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
  
  const isSuperUser = session?.user?.role === "SUPER";

  // Determine if the user is a student based on either prop
  const isStudent = propIsStudent !== undefined ? propIsStudent : role === "student";
  
  // Store temporary uploaded image URL
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  
  // Ensure we're properly prioritizing profile images
  const [imagePreview, setImagePreview] = useState<string | null>(() => {
    // First check for user profile image specific to the role
    if (isStudent && user?.profileImage) return user.profileImage;
    if (!isStudent && user?.image) return user.image;
    
    // Then check other possible locations
    return user?.profileImage || user?.image || null;
  });

  // Select appropriate validation schema based on user type
  const validationSchema = isSuperUser 
    ? superUserProfileSchema 
    : isStudent 
    ? studentProfileSchema 
    : teacherProfileSchema;

  // Initialize form with correct default values based on role
  const { register, handleSubmit, reset, formState: { errors, isDirty, dirtyFields }, setValue } = useForm({
    resolver: zodResolver(validationSchema),
    values: isSuperUser 
      ? {
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
        }
      : isStudent 
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
  });
  
  // Add useEffect to reset form when user data changes
  useEffect(() => {
    if (user) {
      // Reset the form with user data
      if (isSuperUser) {
        reset({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
        });
      } else if (isStudent) {
        reset({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          schoolEmail: user?.schoolEmail || '',
        });
      } else {
        reset({
          firstName: user?.firstName || user?.teacherProfile?.firstName || '',
          lastName: user?.lastName || user?.teacherProfile?.lastName || '',
          email: user?.email || '',
          institution: user?.institution || user?.teacherProfile?.institution || '',
          bio: user?.bio || user?.teacherProfile?.bio || '',
        });
      }
      
      // Reset image preview
      setImagePreview(isStudent
        ? user?.profileImage
        : user?.profileImage || user?.image || null
      );
      
      // Clear uploaded image URL when user changes
      setUploadedImageUrl(null);
    }
  }, [user, reset, isStudent, isSuperUser]);

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

      // Use teacher endpoint for both teachers and super users
      const endpoint = isStudent
        ? '/api/student/profile/image'
        : '/api/teacher/profile/image';

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        try {
          // Try to parse as JSON
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to upload image');
        } catch (jsonError) {
          // If not valid JSON, use text response
          throw new Error(`Upload failed: ${errorText || 'Unknown error'}`);
        }
      }

      const data = await res.json();
      
      if (!data.success || !data.imageUrl) {
        throw new Error('Invalid response from server');
      }
      
      // Store the uploaded image URL to be included in form submission
      setUploadedImageUrl(data.imageUrl);
      
      // Update preview with the actual URL from the server
      setImagePreview(data.imageUrl);
      
      toast.success("Image uploaded", {
        description: "Click 'Save Changes' to update your profile with this image"
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
      // Use teacher endpoint for both teachers and super users
      const endpoint = isStudent
        ? '/api/student/profile'
        : '/api/teacher/profile';
        
      // Prepare payload based on user type
      let payload: any;
      
      if (isSuperUser) {
        payload = {
          firstName: data.firstName,
          lastName: data.lastName,
          // Include the uploaded image URL if available
          profileImage: uploadedImageUrl || undefined,
        };
      } else if (isStudent) {
        payload = data;
      } else {
        // Teacher
        payload = {
          firstName: data.firstName,
          lastName: data.lastName,
          institution: data.institution || '',
          bio: data.bio || '',
          // Include the uploaded image URL if available
          profileImage: uploadedImageUrl || undefined,
        };
      }
        
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
      
      const responseData = await res.json();
      
      toast.success("Profile updated", {
        description: "Your profile information has been saved successfully"
      });
      
      // If we had an uploaded image and it was successfully saved
      if (uploadedImageUrl && updateSession) {
        // Update session with new image
        await updateSession({
          ...session?.user,
          image: uploadedImageUrl,
        });
        
        // Create a custom event to notify other components
        const event = new CustomEvent('profileUpdated', { 
          detail: { 
            image: uploadedImageUrl,
            timestamp: Date.now() 
          } 
        });
        window.dispatchEvent(event);
        
        // Store in localStorage to persist across page navigations
        localStorage.setItem('profileUpdated', String(Date.now()));
        
        // Clear the uploaded image URL since it's now saved
        setUploadedImageUrl(null);
      }
      
      // Update session name if it changed
      if (data.firstName && data.lastName && updateSession) {
        await updateSession({
          ...session?.user,
          name: `${data.firstName} ${data.lastName}`
        });
      }

      // Notify parent component about the update with response data
      if (onUpdate) {
        onUpdate(responseData.user || {
          ...payload,
          profileImage: uploadedImageUrl || user?.profileImage || user?.image
        });
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

  // Check if profile has unsaved changes (either dirty fields or uploaded image)
  const hasUnsavedChanges = isDirty || uploadedImageUrl !== null;

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
          
          {!isStudent && !isSuperUser && (
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
          {/* Image preview container with proper sizing */}
          <div className="border border-gray-300 shadow-sm rounded-lg p-1 w-full max-w-[180px] h-[180px] mb-2 flex items-center justify-center overflow-hidden relative">
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
            
            {/* Show indicator when image has been uploaded but not saved */}
            {uploadedImageUrl && (
              <div className="absolute bottom-0 right-0 left-0 bg-orange-500 text-white text-xs py-1 px-2 text-center">
                Unsaved
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
          
          {uploadedImageUrl && (
            <p className="text-xs text-center mt-2 text-amber-600">
              Click "Save Changes" to apply the new profile image
            </p>
          )}
        </div>
      </div>
      
      <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
        <Button 
          type="submit" 
          disabled={saving || (!hasUnsavedChanges)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}