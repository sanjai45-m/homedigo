import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPaymentSettings, savePaymentSettings, validatePaymentSettings } from '@/lib/payment-settings';

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Super-admin access required.' }, { status: 403 });
  try {
    return NextResponse.json({ settings: await getPaymentSettings() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not load payment settings. Please retry.' }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Super-admin access required.' }, { status: 403 });
  let settings;
  try {
    settings = validatePaymentSettings(await request.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid payment settings.' }, { status: 400 });
  }
  try {
    return NextResponse.json({ settings: await savePaymentSettings(settings, user.id), success: true });
  } catch {
    return NextResponse.json({ error: 'Could not save payment settings. Please retry.' }, { status: 503 });
  }
}
