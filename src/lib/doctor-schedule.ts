import { appointmentDate } from './appointment-time';

export type Hours = { start: string; end: string };
export type DoctorSchedule = { days: Hours[][]; slotMinutes: number; bufferMinutes: number; daysOff: string[] };
export type DoctorSlot = { label: string; start: string; end: string; reservedUntil: string; available: boolean; reason: string };
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const BOOKING_DAYS = 30;
export function defaultSchedule(): DoctorSchedule {
  return { days: DAY_NAMES.map((_, day) => day === 0 ? [] : [{ start: '09:00', end: '17:00' }]), slotMinutes: 60, bufferMinutes: 15, daysOff: [] };
}
function minutes(value: string) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Use a valid start and end time.');
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export function validateSchedule(value: unknown): DoctorSchedule {
  const schedule = value as DoctorSchedule;
  if (!schedule || !Array.isArray(schedule.days) || schedule.days.length !== 7
    || ![30, 45, 60, 90, 120].includes(schedule.slotMinutes) || ![0, 15, 30, 45, 60].includes(schedule.bufferMinutes)
    || !Array.isArray(schedule.daysOff) || schedule.daysOff.length > 60) throw new Error('Choose valid weekly hours, visit length and travel time.');
  const days = schedule.days.map((ranges, day) => {
    if (!Array.isArray(ranges) || ranges.length > 2) throw new Error('Use up to two working periods per day.');
    let previousEnd = -1;
    return ranges.map(range => {
      if (!range || minutes(range.start) < previousEnd || minutes(range.end) - minutes(range.start) < schedule.slotMinutes) {
        throw new Error(`${DAY_NAMES[day]}: hours must not overlap and must fit a full visit.`);
      }
      previousEnd = minutes(range.end);
      return { start: range.start, end: range.end };
    });
  });
  const daysOff = [...new Set(schedule.daysOff.map(day => appointmentDate(day)))];
  return { days, slotMinutes: schedule.slotMinutes, bufferMinutes: schedule.bufferMinutes, daysOff };
}
export function bookableDate(value: string, now = new Date()) {
  const date = appointmentDate(value, now), today = appointmentDate('Today', now);
  const difference = (Date.parse(date) - Date.parse(today)) / 86400000;
  if (difference < 0 || difference >= BOOKING_DAYS) throw new Error('Choose a date within the next 30 days.');
  return date;
}
export function slotLabel(start: number, end: number) {
  const time = (value: number) => `${String(Math.floor(value / 60) % 12 || 12).padStart(2, '0')}:${String(value % 60).padStart(2, '0')} ${value < 720 ? 'AM' : 'PM'}`;
  return `${time(start)} - ${time(end)}`;
}
export function scheduleSlots(schedule: DoctorSchedule, date: string, busy: { start: string; end: string }[] = [], now = new Date()): DoctorSlot[] {
  const normalized = bookableDate(date, now);
  if (schedule.daysOff.includes(normalized)) return [];
  const weekday = new Date(normalized + 'T12:00:00+05:30').getUTCDay();
  const midnight = Date.parse(normalized + 'T00:00:00+05:30');
  return schedule.days[weekday].flatMap(range => {
    const result: DoctorSlot[] = [];
    for (let start = minutes(range.start); start + schedule.slotMinutes <= minutes(range.end); start += schedule.slotMinutes + schedule.bufferMinutes) {
      const begins = midnight + start * 60000;
      const ends = begins + schedule.slotMinutes * 60000;
      const reserved = ends + schedule.bufferMinutes * 60000;
      const past = begins <= now.getTime();
      const occupied = busy.some(interval => begins < Date.parse(interval.end) && reserved > Date.parse(interval.start));
      result.push({ label: slotLabel(start, start + schedule.slotMinutes), start: new Date(begins).toISOString(),
        end: new Date(ends).toISOString(), reservedUntil: new Date(reserved).toISOString(), available: !past && !occupied,
        reason: past ? 'Time passed' : occupied ? 'Booked' : '' });
    }
    return result;
  });
}
