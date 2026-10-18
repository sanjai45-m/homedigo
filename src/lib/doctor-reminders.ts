export const DEFAULT_REMINDERS = [60, 30, 15];
export function validateReminders(value: unknown): number[] {
  if (!Array.isArray(value) || value.length > 5 || value.some(minutes => !Number.isInteger(minutes) || minutes < 1 || minutes > 1440)) {
    throw new Error('Choose up to five reminders, each between 1 and 1,440 minutes before the visit.');
  }
  if (new Set(value).size !== value.length) throw new Error('Choose a different time for each reminder.');
  return [...value].sort((a, b) => b - a);
}
export function reminderExample(minutes: number) {
  const total = 600 - minutes;
  const clock = (total + 1440) % 1440;
  const hour = Math.floor(clock / 60);
  return `${total < 0 ? 'Previous day, ' : ''}${hour % 12 || 12}:${String(clock % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}
