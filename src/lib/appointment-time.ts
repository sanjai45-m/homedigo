// HomeDigo appointments use India Standard Time, regardless of server/browser timezone.
const IST_OFFSET_MS = 330 * 60 * 1000;

export function appointmentDate(date: string, reference = new Date()): string {
  const offsets: Record<string, number> = { Today: 0, Tomorrow: 1, 'Day After Tomorrow': 2 };
  const offset = offsets[date];
  const normalized = offset === undefined ? date : new Date(
    reference.getTime() + IST_OFFSET_MS + offset * 86400000,
  ).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) ||
      !Number.isFinite(Date.parse(normalized)) ||
      new Date(normalized).toISOString().slice(0, 10) !== normalized) {
    throw new Error('Choose a valid appointment date.');
  }
  return normalized;
}

export function appointmentStart(date: string, slot: string, reference = new Date()): string {
  const normalized = appointmentDate(date, reference);
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)$/i.exec(slot.trim());
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 12 || Number(match[2]) > 59) {
    throw new Error('Choose a valid appointment time slot.');
  }
  const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return new Date(`${normalized}T${String(hour).padStart(2, '0')}:${match[2]}:00+05:30`).toISOString();
}
