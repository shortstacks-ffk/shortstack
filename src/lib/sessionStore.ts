'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
}

interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  lastActivity: number;
  setUser: (user: User | null) => void;
  updateLastActivity: () => void;
  logout: () => void;
}

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

// Create a store with the session state persisted in localStorage
export const useSessionStore = create<SessionState>()(
  persist(
    (set: (partial: Partial<SessionState> | ((state: SessionState) => Partial<SessionState>)) => void) => ({
      user: null,
      isAuthenticated: false,
      lastActivity: Date.now(),
      
      setUser: (user: User | null) => set({ 
        user, 
        isAuthenticated: !!user,
        lastActivity: Date.now() 
      }),
      
      updateLastActivity: () => set({ 
        lastActivity: Date.now() 
      }),
      
      logout: () => set({ 
        user: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'shortstack-session',
      // Add some processing to ensure data integrity when loading from storage
      onRehydrateStorage: () => (state: SessionState | undefined) => {
        // Check if session has timed out upon rehydration
        if (state) {
          const now = Date.now();
          const lastActivity = state.lastActivity;
          
          if (now - lastActivity > SESSION_TIMEOUT) {
            // Session has timed out, log user out
            state.logout();
          }
        }
      }
    }
  )
);

// Create a hook to provide session timeout functionality
export function useSessionTimeout() {
  const { isAuthenticated, lastActivity, logout, updateLastActivity } = useSessionStore();
  
  // Check if the session has timed out
  const checkSessionTimeout = () => {
    if (isAuthenticated) {
      const now = Date.now();
      if (now - lastActivity > SESSION_TIMEOUT) {
        logout();
        return true; // Session timed out
      } else {
        updateLastActivity();
        return false; // Session active
      }
    }
    return false; // Not authenticated
  };
  
  return { checkSessionTimeout };
}