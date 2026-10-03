import { NextResponse } from 'next/server';
import { sendDoctorAppointmentEmail } from '@/lib/email';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'A single valid target email is required' }, { status: 400 });
    }

    const result = await sendDoctorAppointmentEmail({
      doctorEmail: email,
      doctorName: 'Dr. Test Physician',
      patientName: 'Test Patient (Sanju)',
      serviceTitle: 'General Doctor Consultation (Home Visit)',
      scheduledDate: 'Today',
      scheduledTimeSlot: '10:00 AM - 11:00 AM',
      addressText: 'Bengaluru, Karnataka, India',
      bookingNumber: 'HD-TEST-2026',
      totalAmount: 550,
    });

    if (!result.success) {
      return NextResponse.json(result, {
        status: result.code === 'SMTP_NOT_CONFIGURED' || result.code === 'SMTP_INVALID_CONFIG' ? 503 : 502,
      });
    }

    return NextResponse.json({
      success: true,
      message: `SMTP accepted the test email to ${email}. Check the inbox and spam folder.`,
      result,
    });
  } catch (err: unknown) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to dispatch test email' }, { status: 500 });
  }
}
