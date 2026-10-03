import nodemailer from 'nodemailer';

export type EmailResult =
  | { success: true; messageId: string }
  | { success: false; code: string; error: string };

function emailFailure(code: string, error: string): EmailResult {
  // Log actionable diagnostics without credentials or patient details.
  console.error('[EMAIL DISPATCH ERROR]', { code, error });
  return { success: false, code, error };
}

export interface DoctorNotificationParams {
  doctorEmail: string;
  doctorName: string;
  patientName: string;
  serviceTitle: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  addressText: string;
  bookingNumber: string;
  totalAmount: number;
}

/**
 * Sends an email notification to the doctor/healthcare partner whenever a patient books an appointment.
 */
export async function sendDoctorAppointmentEmail(params: DoctorNotificationParams): Promise<EmailResult> {
  const {
    doctorEmail,
    doctorName,
    patientName,
    serviceTitle,
    scheduledDate,
    scheduledTimeSlot,
    addressText,
    bookingNumber,
    totalAmount,
  } = params;

  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://homedigo.vercel.app';
  const partnerDashboardUrl = `${portalUrl}/partner/dashboard`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%); padding: 28px 24px; color: #ffffff; text-align: left; }
          .header-badge { display: inline-block; background-color: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .header h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
          .content { padding: 28px 24px; }
          .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; }
          .card { background-color: #f1f5f9; border-radius: 14px; padding: 20px; margin: 20px 0; border: 1px solid #cbd5e1; }
          .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; border-b: 1px border-dashed #cbd5e1; padding-bottom: 8px; }
          .row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
          .label { color: #64748b; font-weight: 600; }
          .value { color: #0f172a; font-weight: 700; text-align: right; }
          .highlight { color: #0d9488; font-weight: 800; }
          .btn-container { text-align: center; margin-top: 24px; }
          .btn { display: inline-block; background-color: #0d9488; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; box-shadow: 0 4px 12px rgba(13,148,136,0.3); }
          .footer { padding: 20px 24px; background-color: #f8fafc; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="header-badge">New Home Visit Request</span>
            <h2>🏥 Patient Appointment Notification</h2>
          </div>
          <div class="content">
            <p class="greeting">Hello Dr. ${doctorName},</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
              A patient has booked a new home consultation visit with you on the HomeDigo Platform. Please check the details below and confirm your availability:
            </p>
            
            <div class="card">
              <div class="row">
                <span class="label">Booking Reference:</span>
                <span class="value highlight">${bookingNumber}</span>
              </div>
              <div class="row">
                <span class="label">Patient Name:</span>
                <span class="value">${patientName}</span>
              </div>
              <div class="row">
                <span class="label">Clinical Service:</span>
                <span class="value">${serviceTitle}</span>
              </div>
              <div class="row">
                <span class="label">Date & Time Slot:</span>
                <span class="value">${scheduledDate} (${scheduledTimeSlot})</span>
              </div>
              <div class="row">
                <span class="label">Patient Address:</span>
                <span class="value">${addressText}</span>
              </div>
              <div class="row">
                <span class="label">Consultation Fee:</span>
                <span class="value" style="color: #16a34a;">₹${totalAmount}</span>
              </div>
            </div>

            <div class="btn-container">
              <a href="${partnerDashboardUrl}" class="btn">View & Confirm Availability →</a>
            </div>
          </div>
          <div class="footer">
            <p>HomeDigo Platform · At-Home Clinical Excellence · Verified Doctor Partner Network</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: doctorEmail,
    subject: `New Patient Appointment: ${patientName} - ${scheduledDate} (${scheduledTimeSlot})`,
    html: htmlContent,
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

export interface AppointmentEmailParams {
  to: string;
  patientName: string;
  doctorName: string;
  bookingId: string;
  bookingNumber: string;
  serviceTitle: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
}

export async function sendAppointmentConfirmationEmail(params: AppointmentEmailParams): Promise<EmailResult> {
  return sendAppointmentUpdate(params, false);
}

export async function sendDoctorReminderEmail(params: AppointmentEmailParams): Promise<EmailResult> {
  return sendAppointmentUpdate(params, true);
}

function sendAppointmentUpdate(params: AppointmentEmailParams, reminder: boolean): Promise<EmailResult> {
  const portalUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://homedigo.vercel.app').replace(/\/$/, '');
  const title = reminder ? 'Your appointment is starting soon' : 'Your appointment is confirmed';
  const message = reminder
    ? 'Your confirmed appointment starts soon. Please prepare for your visit at the scheduled time below.'
    : `${params.doctorName} has confirmed availability for your appointment.`;
  const path = reminder ? '/partner/dashboard' : `/patient/appointments/${encodeURIComponent(params.bookingId)}`;
  const text = `${title}\n\n${message}\nBooking: ${params.bookingNumber}\nPatient: ${params.patientName}\nDoctor: ${params.doctorName}\nService: ${params.serviceTitle}\nDate: ${params.scheduledDate}\nTime: ${params.scheduledTimeSlot} (IST)\n\nView appointment: ${portalUrl}${path}`;
  return sendEmail({
    to: params.to,
    subject: `${title} - ${params.bookingNumber}`,
    text,
    html: `<div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;padding:24px;color:#1e293b">
      <h2 style="color:#0d9488">${title}</h2>
      <p>${escapeHtml(message)}</p>
      <p><strong>Booking:</strong> ${escapeHtml(params.bookingNumber)}</p>
      <p><strong>Patient:</strong> ${escapeHtml(params.patientName)}</p>
      <p><strong>Doctor:</strong> ${escapeHtml(params.doctorName)}</p>
      <p><strong>Service:</strong> ${escapeHtml(params.serviceTitle)}</p>
      <p><strong>Date:</strong> ${escapeHtml(params.scheduledDate)}</p>
      <p><strong>Time:</strong> ${escapeHtml(params.scheduledTimeSlot)} (IST)</p>
      <a href="${escapeHtml(portalUrl + path)}" style="color:#0d9488">View appointment</a>
      <p>HomeDigo Health</p>
    </div>`,
  });
}

async function sendEmail(message: { to: string; subject: string; html: string; text?: string }): Promise<EmailResult> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass?.trim()) {
    return emailFailure('SMTP_NOT_CONFIGURED', 'SMTP_HOST, SMTP_USER and SMTP_PASS must be configured. Redeploy after updating Vercel environment variables.');
  }

  const port = Number(process.env.SMTP_PORT?.trim() || 587);
  const secureSetting = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return emailFailure('SMTP_INVALID_CONFIG', 'SMTP_PORT must be a valid port number.');
  }
  if (secureSetting && secureSetting !== 'true' && secureSetting !== 'false') {
    return emailFailure('SMTP_INVALID_CONFIG', 'SMTP_SECURE must be true or false, or omitted to infer it from SMTP_PORT.');
  }
  const secure = secureSetting ? secureSetting === 'true' : port === 465;
  if ((port === 465 && !secure) || (port === 587 && secure)) {
    return emailFailure('SMTP_INVALID_CONFIG', 'Use SMTP_SECURE=true with port 465, or SMTP_SECURE=false with port 587 (STARTTLS).');
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      dnsTimeout: 10000,
    });

    const info = await transporter.sendMail({
      from: {
        name: process.env.SMTP_FROM_NAME?.trim() || 'HomeDigo Health',
        address: process.env.SMTP_FROM_EMAIL?.trim() || user,
      },
      ...message,
    });

    if (!info.accepted?.length) {
      return emailFailure('SMTP_RECIPIENT_REJECTED', 'The SMTP server did not accept the recipient. Check the recipient address and sender permissions.');
    }
    console.log('[EMAIL DISPATCH SUCCESS]', { messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (err: unknown) {
    const smtpError = err as { code?: string; responseCode?: number; command?: string } | null;
    const code = smtpError?.code || 'SMTP_SEND_FAILED';
    console.error('[SMTP ERROR]', { code, responseCode: smtpError?.responseCode, command: smtpError?.command });
    const messages: Record<string, string> = {
      EAUTH: 'SMTP authentication failed. Check SMTP_USER and SMTP_PASS. Gmail requires a Google account or Workspace mailbox and an app password when using password authentication.',
      ETIMEDOUT: 'SMTP connection timed out. Check SMTP_HOST, SMTP_PORT and SMTP_SECURE.',
      ESOCKET: 'SMTP connection or TLS failed. Check SMTP_HOST and use port 465 with TLS or port 587 with STARTTLS.',
      ECONNECTION: 'Could not connect to the SMTP server. Check SMTP_HOST and SMTP_PORT.',
      EDNS: 'SMTP host could not be resolved. Check SMTP_HOST.',
      EENVELOPE: 'SMTP rejected the sender or recipient. Check SMTP_FROM_EMAIL and the recipient address.',
      EMESSAGE: 'SMTP rejected the message. Check the sender permissions and provider sending limits.',
    };
    return emailFailure(code, messages[code] || 'SMTP did not accept the email. Check the SMTP error code in Vercel function logs.');
  }
}
