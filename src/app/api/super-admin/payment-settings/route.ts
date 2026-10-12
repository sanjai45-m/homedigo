import { requireApiUser } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { getPaymentSettings, savePaymentSettings, validatePaymentSettings } from '@/lib/payment-settings';

export async function GET() {
  const authorization = await requireApiUser(["SUPER_ADMIN"]);
  if (authorization.response) return authorization.response;

  const session = { user: authorization.user };
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Super-admin access required.' }, { status: 403 });
  try {
    return NextResponse.json({ settings: await getPaymentSettings() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not load payment settings. Please retry.' }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireApiUser(["SUPER_ADMIN"], request);
  if (authorization.response) return authorization.response;

  const session = { user: authorization.user };
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
