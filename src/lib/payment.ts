export const PAYMENT_PHONE = '9361557446';
export const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;

export function paymentConfig() {
  const upiId = process.env.UPI_PAYEE_ID?.trim() || '';
  return {
    phone: PAYMENT_PHONE,
    upiId: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(upiId) ? upiId : '',
    payeeName: process.env.UPI_PAYEE_NAME?.trim() || 'HomeDigo',
  };
}

export function upiPaymentLink(app: 'GPAY' | 'PHONEPE' | 'UPI', upiId: string, name: string, amount: number, reference: string, android = false) {
  if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(upiId) || !Number.isFinite(amount) || amount <= 0) return '';
  const query = new URLSearchParams({ pa: upiId, pn: name, am: amount.toFixed(2), cu: 'INR', tn: 'HomeDigo appointment', tr: reference }).toString();
  if (android && app !== 'UPI') {
    const packageName = app === 'GPAY' ? 'com.google.android.apps.nbu.paisa.user' : 'com.phonepe.app';
    return `intent://pay?${query}#Intent;scheme=upi;package=${packageName};end`;
  }
  const scheme = app === 'GPAY' ? 'gpay' : app === 'PHONEPE' ? 'phonepe' : 'upi';
  return `${scheme}://${app === 'GPAY' ? 'upi/' : ''}pay?${query}`;
}

// Only bounded raster screenshots are served inline. Never accept SVG/HTML uploads.
export function validateReceipt(value: unknown): { base64: string; mime: string } {
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_RECEIPT_BYTES / 3) * 4 + 50) {
    throw new Error('Upload a payment screenshot (PNG, JPEG or WebP, up to 2 MB).');
  }
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new Error('Upload a PNG, JPEG or WebP payment screenshot.');
  const bytes = Buffer.from(match[2], 'base64');
  const valid = match[1] === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : match[1] === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid || bytes.length < 16 || bytes.length > MAX_RECEIPT_BYTES || bytes.toString('base64') !== match[2]) {
    throw new Error('Invalid payment screenshot. Upload a PNG, JPEG or WebP image up to 2 MB.');
  }
  return { base64: match[2], mime: match[1] };
}
