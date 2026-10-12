import { executeQuery } from './db';
import { paymentConfig } from './payment';

export interface PaymentSettings {
  phone: string;
  upiId: string;
  payeeName: string;
}

let ready: Promise<void> | undefined;
export function ensurePaymentSettingsSchema() {
  ready ??= (async () => {
    const result = await executeQuery(`CREATE TABLE IF NOT EXISTS payment_settings (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      phone VARCHAR(10) NOT NULL CHECK (phone ~ '^[6-9][0-9]{9}$'),
      upi_id VARCHAR(255) NOT NULL DEFAULT '',
      payee_name VARCHAR(100) NOT NULL,
      updated_by VARCHAR(64) NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    if (!result.isConnected) throw new Error('Payment settings are unavailable.');
  })().catch(error => { ready = undefined; throw error; });
  return ready;
}

export function validatePaymentSettings(value: unknown): PaymentSettings {
  const input = value as Partial<PaymentSettings> | null;
  if (!input || typeof input.phone !== 'string') throw new Error('Enter a valid 10-digit Indian mobile number.');
  const phone = input.phone.trim().replace(/[\s()-]/g, '').replace(/^\+91/, '');
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Enter a valid 10-digit Indian mobile number.');
  if (typeof input.upiId !== 'string' || typeof input.payeeName !== 'string') throw new Error('Enter the payment details.');
  const upiId = input.upiId.trim();
  const payeeName = input.payeeName.trim();
  if (upiId.length > 255 || (upiId && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(upiId))) throw new Error('Enter a valid UPI ID or leave it blank.');
  if (!payeeName || payeeName.length > 100) throw new Error('Enter a recipient name of up to 100 characters.');
  return { phone, upiId, payeeName };
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  await ensurePaymentSettingsSchema();
  const result = await executeQuery(`SELECT phone, upi_id AS "upiId", payee_name AS "payeeName" FROM payment_settings WHERE id = 1`);
  if (!result.isConnected) throw new Error('Payment settings are unavailable.');
  // Only an unconfigured installation uses defaults, never a failed database read.
  return result.rows[0] || paymentConfig();
}

export async function savePaymentSettings(settings: PaymentSettings, userId: string): Promise<PaymentSettings> {
  await ensurePaymentSettingsSchema();
  const result = await executeQuery(`INSERT INTO payment_settings (id, phone, upi_id, payee_name, updated_by)
    VALUES (1, $1, $2, $3, $4)
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, upi_id = EXCLUDED.upi_id,
      payee_name = EXCLUDED.payee_name, updated_by = EXCLUDED.updated_by, updated_at = NOW()
    RETURNING phone, upi_id AS "upiId", payee_name AS "payeeName"`, [settings.phone, settings.upiId, settings.payeeName, userId]);
  if (!result.isConnected || !result.rows.length) throw new Error('Could not save payment settings.');
  return result.rows[0];
}
