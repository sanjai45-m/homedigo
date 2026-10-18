export const MAX_CANCELLATION_REASON = 500;

export function cancellationReason(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error('Enter a valid cancellation reason.');
  const reason = value.trim();
  if (reason.length > MAX_CANCELLATION_REASON) throw new Error('Keep the cancellation reason within 500 characters.');
  return reason || null;
}
