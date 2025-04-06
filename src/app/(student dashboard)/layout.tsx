'use client';

import { SessionProvider } from 'next-auth/react';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen">
        {children}
      </div>
    </SessionProvider>
  );
}