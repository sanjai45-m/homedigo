import { bookableDate } from '@/lib/doctor-schedule';
import { readDoctorSlots } from '@/lib/doctor-schedule-store';

export const dynamic = 'force-dynamic';
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let date;
  try { date = bookableDate(new URL(request.url).searchParams.get('date') || 'Today'); }
  catch { return reply({ error: 'Choose a date within the next 30 days.' }, 400); }
  try {
    const result = await readDoctorSlots(id, date);
    if (!result) return reply({ error: 'This doctor is not available for booking.' }, 404);
    return reply({ ...result, version: undefined, timezone: 'Asia/Kolkata', serverNow: new Date().toISOString() });
  } catch { return reply({ error: 'Appointment times could not be loaded. Please retry.' }, 503); }
}
