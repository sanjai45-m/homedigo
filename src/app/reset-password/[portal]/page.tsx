import { notFound } from 'next/navigation';
import PasswordReset from '@/components/auth/PasswordReset';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function Page({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = await params;
  if (portal !== 'patient' && portal !== 'partner' && portal !== 'admin') notFound();
  return <PasswordReset portal={portal} />;
}
