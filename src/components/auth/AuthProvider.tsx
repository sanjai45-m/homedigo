'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import StaffAuthProvider from './StaffAuthProvider';
import { staffPortal } from '@/lib/staff-client';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const portal = staffPortal(usePathname());
  if (portal) return <StaffAuthProvider key={portal} portal={portal}>{children}</StaffAuthProvider>;
  return <SessionProvider>{children}</SessionProvider>;
}
