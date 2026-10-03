/**
 * Haversine Formula to compute real-time distance in kilometers between two GPS coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Number(distance.toFixed(1));
}

/**
 * Estimate travel time in minutes based on distance
 */
export function estimateTravelMinutes(distanceKm: number): number {
  if (!distanceKm || distanceKm <= 0) return 10;
  // Average urban speed ~ 25 km/h + 5 mins buffer
  const minutes = Math.round((distanceKm / 25) * 60 + 5);
  return Math.max(minutes, 8);
}

/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim
 */
export async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Homedigo-Healthcare-App/1.0',
        },
      }
    );
    const data = await res.json();
    if (data && data.address) {
      const suburb =
        data.address.suburb ||
        data.address.neighbourhood ||
        data.address.road ||
        data.address.residential ||
        '';
      const city =
        data.address.city ||
        data.address.town ||
        data.address.state_district ||
        data.address.state ||
        'Bengaluru';
      const displayName = suburb ? `${suburb}, ${city}` : data.display_name.split(',').slice(0, 3).join(',');

      return {
        displayName,
        city,
        fullAddress: data.display_name,
        postcode: data.address.postcode || '',
        lat,
        lng,
      };
    }
  } catch (err) {
    console.error('Reverse geocode error:', err);
  }

  return {
    displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    city: 'Bengaluru',
    fullAddress: '',
    lat,
    lng,
  };
}

/**
 * Search locations using OpenStreetMap Nominatim
 */
export async function searchLocations(query: string) {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=in&limit=6&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Homedigo-Healthcare-App/1.0',
        },
      }
    );
    const data = await res.json();
    return data.map((item: any) => ({
      placeId: item.place_id,
      displayName: item.display_name.split(',').slice(0, 3).join(','),
      fullAddress: item.display_name,
      city:
        item.address?.city ||
        item.address?.town ||
        item.address?.state_district ||
        'Bengaluru',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (err) {
    console.error('Search locations error:', err);
    return [];
  }
}
