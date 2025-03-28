'use client';

import { useSessionStore } from '@/src/lib/sessionStore';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export function useSession() {
  const { isSignedIn, signOut } = useAuth();
  const { user, isAuthenticated, logout, updateLastActivity } = useSessionStore();
  const router = useRouter();

  const logoutUser = async () => {
    logout();
    await signOut();
    router.push('/login');
  };

  // Call this when you need to extend the session (e.g., after important actions)
  const extendSession = () => {
    updateLastActivity();
  };

  return {
    user,
    isAuthenticated: isAuthenticated && !!isSignedIn,
    logout: logoutUser,
    extendSession,
  };
}