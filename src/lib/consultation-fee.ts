export const MIN_CONSULTATION_FEE = 1;
export const MAX_CONSULTATION_FEE = 99999999.99;
export const CONSULTATION_FEE_ERROR = 'Enter a consultation fee from ₹1 to ₹99,999,999.99 with up to two decimal places.';

export function parseConsultationFee(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const fee = Number(value);
  if (!Number.isFinite(fee) || fee < MIN_CONSULTATION_FEE || fee > MAX_CONSULTATION_FEE) return null;
  const paise = fee * 100;
  if (Math.abs(paise - Math.round(paise)) > 0.000001) return null;
  return fee;
}
