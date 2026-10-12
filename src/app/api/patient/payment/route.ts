import { NextResponse } from 'next/server';
import { getPaymentSettings } from '@/lib/payment-settings';

export async function GET() {
  try {
    return NextResponse.json(await getPaymentSettings(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Payment details are unavailable. Please retry before paying.' }, { status: 503 });
  }
}
