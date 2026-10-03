import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

/**
 * Haversine distance formula in kilometers between two coordinates
 */
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * GET /api/pro/visits/[id]/location
 * Returns the partner's current GPS position, visit status, distance to patient, and proximity flags.
 * Polled every 5s by the patient's live tracker.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (isDbConfigured) {
    const res = await executeQuery(
      `SELECT b.partner_lat, b.partner_lng, 
              COALESCE(b.patient_lat, a.lat) as patient_lat, 
              COALESCE(b.patient_lng, a.lng) as patient_lng, 
              b.status 
       FROM bookings b
       LEFT JOIN addresses a ON b.address_id = a.id
       WHERE b.id = $1`,
      [id]
    );
    if (res.isConnected && res.rows.length > 0) {
      const row = res.rows[0];
      const pLat = row.partner_lat ? Number(row.partner_lat) : null;
      const pLng = row.partner_lng ? Number(row.partner_lng) : null;
      const patLat = row.patient_lat ? Number(row.patient_lat) : (pLat ? pLat : 12.9716);
      const patLng = row.patient_lng ? Number(row.patient_lng) : (pLng ? pLng : 77.5946);

      let distanceKm: number | null = null;
      let isNearby = false;
      let isImmediate = false;
      let etaMins: number | null = null;
      let currentStatus = row.status;

      if (pLat !== null && pLng !== null) {
        distanceKm = calculateHaversineKm(pLat, pLng, patLat, patLng);
        distanceKm = Number(distanceKm.toFixed(2));
        isNearby = distanceKm <= 2.5; // Within 2.5 km radius
        isImmediate = distanceKm <= 0.4; // Within 400 meters
        etaMins = Math.max(1, Math.round((distanceKm / 25) * 60)); // Avg 25 km/h urban speed

        // Auto-transition to ARRIVED if doctor gets within 500 meters (0.5 km) while ON_THE_WAY
        if (distanceKm <= 0.5 && currentStatus === 'ON_THE_WAY') {
          currentStatus = 'ARRIVED';
          await executeQuery(`UPDATE bookings SET status = 'ARRIVED' WHERE id = $1`, [id]);
        }
      }

      return NextResponse.json({
        lat: pLat,
        lng: pLng,
        patientLat: patLat,
        patientLng: patLng,
        status: currentStatus,
        distanceKm,
        isNearby,
        isImmediate,
        etaMins,
      });
    }
  }

  return NextResponse.json({
    lat: null,
    lng: null,
    status: 'ASSIGNED',
    distanceKm: null,
    isNearby: false,
    isImmediate: false,
    etaMins: null,
  });
}

/**
 * POST /api/pro/visits/[id]/location
 * Called by the partner's device while traveling.
 * Body: { lat: number, lng: number }
 * Updates GPS and transitions status to ON_THE_WAY or ARRIVED depending on proximity.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { lat, lng } = body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid coordinates. lat and lng must be numbers.' },
        { status: 400 }
      );
    }

    if (isDbConfigured) {
      // Fetch patient location first to check proximity
      const bookingRes = await executeQuery(
        `SELECT b.status, 
                COALESCE(b.patient_lat, a.lat) as patient_lat, 
                COALESCE(b.patient_lng, a.lng) as patient_lng 
         FROM bookings b
         LEFT JOIN addresses a ON b.address_id = a.id
         WHERE b.id = $1`,
        [id]
      );

      let newStatus = 'ON_THE_WAY';
      let distanceKm: number | null = null;
      let isNearby = false;
      let isImmediate = false;

      if (bookingRes.isConnected && bookingRes.rows.length > 0) {
        const row = bookingRes.rows[0];
        const patLat = row.patient_lat ? Number(row.patient_lat) : lat;
        const patLng = row.patient_lng ? Number(row.patient_lng) : lng;

        distanceKm = calculateHaversineKm(lat, lng, patLat, patLng);
        distanceKm = Number(distanceKm.toFixed(2));
        isNearby = distanceKm <= 2.5;
        isImmediate = distanceKm <= 0.4;

        if (distanceKm <= 0.5) {
          newStatus = 'ARRIVED';
        } else if (['CONFIRMED', 'ASSIGNED'].includes(row.status)) {
          newStatus = 'ON_THE_WAY';
        } else {
          newStatus = row.status;
        }
      }

      const updateRes = await executeQuery(
        `UPDATE bookings
         SET partner_lat = $1,
             partner_lng = $2,
             status = CASE
               WHEN $3 = 'ARRIVED' THEN 'ARRIVED'
               WHEN status IN ('CONFIRMED', 'ASSIGNED') THEN $3
               ELSE status
             END
         WHERE id = $4
         RETURNING partner_lat, partner_lng, status`,
        [lat, lng, newStatus, id]
      );

      if (updateRes.isConnected && updateRes.rows.length > 0) {
        const updatedRow = updateRes.rows[0];
        return NextResponse.json({
          success: true,
          lat: Number(updatedRow.partner_lat),
          lng: Number(updatedRow.partner_lng),
          status: updatedRow.status,
          distanceKm,
          isNearby,
          isImmediate,
        });
      }
    }

    // Offline fallback (dev mode)
    return NextResponse.json({
      success: true,
      lat,
      lng,
      status: 'ARRIVED',
      distanceKm: 0.1,
      isNearby: true,
      isImmediate: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update location' },
      { status: 500 }
    );
  }
}
