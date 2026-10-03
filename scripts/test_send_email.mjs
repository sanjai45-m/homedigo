import fs from 'fs';
import nodemailer from 'nodemailer';

// Read .env.local manually
let envVars = {};
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (key && !key.startsWith('#')) {
        envVars[key] = val;
      }
    }
  });
} catch (e) {}

const doctorEmail = 'sanjaikrish324@gmail.com';
const doctorName = 'Dr. Sanjai Krishnan';
const patientName = 'Kamesh Kumar (Family Care)';
const serviceTitle = 'Senior Physician & General Home Care Visit';
const scheduledDate = 'Today';
const scheduledTimeSlot = '10:00 AM - 11:00 AM';
const addressText = 'Indiranagar 100ft Road, Bengaluru, Karnataka - 560038';
const bookingNumber = 'HD-9842';
const totalAmount = 550;

const portalUrl = 'https://homedigo.vercel.app';
const partnerDashboardUrl = `${portalUrl}/partner/dashboard`;

const htmlContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%); padding: 28px 24px; color: #ffffff; text-align: left; }
        .header-badge { display: inline-block; background-color: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .header h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 28px 24px; }
        .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; }
        .card { background-color: #f1f5f9; border-radius: 14px; padding: 20px; margin: 20px 0; border: 1px solid #cbd5e1; }
        .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; border-bottom: 1px border-dashed #cbd5e1; padding-bottom: 8px; }
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
          <p class="greeting">Hello ${doctorName},</p>
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

async function main() {
  const host = envVars.SMTP_HOST || process.env.SMTP_HOST;
  const user = envVars.SMTP_USER || process.env.SMTP_USER;
  const pass = envVars.SMTP_PASS || process.env.SMTP_PASS;

  console.log(`[TEST EMAIL SCRIPT] Target recipient: ${doctorEmail}`);
  console.log(`[TEST EMAIL SCRIPT] SMTP_HOST: ${host || 'Not set'}`);
  console.log(`[TEST EMAIL SCRIPT] SMTP_USER: ${user || 'Not set'}`);

  if (!host || !user || !pass) {
    console.log('\n❌ SMTP Environment variables not found locally in .env.local.');
    console.log('Once you add SMTP_HOST, SMTP_USER, SMTP_PASS to Vercel, production automatically dispatches this email payload to Gmail!');
    console.log('\nGenerated HTML Email Preview generated successfully.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(envVars.SMTP_PORT || 587),
      secure: false,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `"HomeDigo Health" <${user}>`,
      to: doctorEmail,
      subject: `🚨 New Patient Appointment: ${patientName} - ${scheduledDate} (${scheduledTimeSlot})`,
      html: htmlContent,
    });

    console.log(`\n✅ EMAIL SUCCESSFULLY SENT to ${doctorEmail}! Message ID: ${info.messageId}`);
  } catch (err) {
    console.error('\n❌ SMTP Dispatch Error:', err.message);
  }
}

main();
