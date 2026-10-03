export const HOMEDIGO_REVENUE_PERCENT = 10;
export const CLINICIAN_REVENUE_PERCENT = 100 - HOMEDIGO_REVENUE_PERCENT;

// Round the application share to paise, then give the remainder to the clinician.
// Computing both percentages independently can lose or create a paisa.
export function splitAppointmentAmount(amount: number | string | null | undefined) {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Appointment amount must be a non-negative number.');
  }
  const grossPaise = Math.round(value * 100);
  const commissionPaise = Math.round(grossPaise * HOMEDIGO_REVENUE_PERCENT / 100);
  return {
    grossAmount: grossPaise / 100,
    commission: commissionPaise / 100,
    netPayout: (grossPaise - commissionPaise) / 100,
  };
}

export function formatRevenue(amount: number) {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
