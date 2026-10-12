export type Coordinates = { lat: number; lng: number };
export const LOCATION_FRESH_MS = 30_000;

/** Database decimals may be strings. Missing values and partial pairs are never positions. */
export function coordinates(lat: unknown, lng: unknown): Coordinates | null {
  if (![lat, lng].every(value => (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '')) return null;
  const latitude = Number(lat), longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { lat: latitude, lng: longitude } : null;
}

export function distanceKm(a: Coordinates, b: Coordinates): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function locationIsFresh(updatedAt: string | null | undefined, now = Date.now()): boolean {
  const age = now - Date.parse(updatedAt || '');
  return Number.isFinite(age) && age >= -5000 && age <= LOCATION_FRESH_MS;
}
