import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { processAppointmentEmails } from '@/lib/appointment-notifications';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Reminder scheduler is not configured.' }, { status: 503 });
  const provided = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    const result = await processAppointmentEmails();
    return NextResponse.json(result, { status: result.failed ? 502 : 200 });
  } catch {
    return NextResponse.json({ error: 'Appointment emails could not be processed.' }, { status: 503 });
  }
}
