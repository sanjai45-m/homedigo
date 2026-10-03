import { NextResponse } from 'next/server';
import { sendDoctorAppointmentEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Target email is required' }, { status: 400 });
    }

    const hasSmtpConfig = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    );

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

    return NextResponse.json({
      success: true,
      hasSmtpConfig,
      message: hasSmtpConfig
        ? `Test notification dispatched via SMTP (${process.env.SMTP_HOST}) to ${email}!`
        : `SMTP credentials not yet configured in environment variables. Email notification payload logged to server telemetry.`,
      smtpHost: process.env.SMTP_HOST || 'Not configured',
      smtpUser: process.env.SMTP_USER || 'Not configured',
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to dispatch test email' }, { status: 500 });
  }
}
