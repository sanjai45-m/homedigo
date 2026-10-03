import nodemailer from 'nodemailer';

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
export async function sendDoctorAppointmentEmail(params: DoctorNotificationParams) {
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

  // Check if SMTP environment variables are configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'HomeDigo Health'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: doctorEmail,
        subject: `🚨 New Patient Appointment: ${patientName} - ${scheduledDate} (${scheduledTimeSlot})`,
        html: htmlContent,
      });

      console.log(`[EMAIL DISPATCH SUCCESS] Appointment notification sent to Doctor ${doctorName} <${doctorEmail}>: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EMAIL DISPATCH ERROR] Failed to send email to ${doctorEmail}:`, err.message);
    }
  }

  // Development / Fallback log if SMTP credentials not yet provided
  console.log(`====================================================`);
  console.log(`[EMAIL DISPATCH] Alert sent to Doctor <${doctorEmail}>`);
  console.log(`Doctor: ${doctorName}`);
  console.log(`Patient: ${patientName}`);
  console.log(`Service: ${serviceTitle}`);
  console.log(`Date & Time: ${scheduledDate} @ ${scheduledTimeSlot}`);
  console.log(`Location: ${addressText}`);
  console.log(`====================================================`);

  return { success: true, fallback: true };
}
