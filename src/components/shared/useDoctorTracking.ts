'use client';

import { useEffect, useRef, useState } from 'react';
import { coordinates } from '@/lib/tracking';

type LocationUpdate = { lat: number; lng: number; updatedAt: string; status: string;
  patientLat: number | null; patientLng: number | null; distanceKm: number | null; isNearby: boolean; isImmediate: boolean };

export function useDoctorTracking(visitId: string, status: string, onUpdate: (data: LocationUpdate) => void) {
  const [isTracking, setIsTracking] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentGps, setCurrentGps] = useState<LocationUpdate | null>(null);
  const callback = useRef(onUpdate);
  callback.current = onUpdate;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const stopJourney = () => {
    generation.current++;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    controller.current?.abort();
    setIsTracking(false);
  };

  const startJourney = () => {
    stopJourney();
    setGpsError(null);
    setCurrentGps(null);
    if (!navigator.geolocation) { setGpsError('GPS is not supported on this device.'); return; }
    if (!['CONFIRMED', 'ON_THE_WAY', 'ARRIVED'].includes(status)) {
      setGpsError('Accept the appointment and verify payment before starting the journey.'); return;
    }
    const run = generation.current;
    let busy = false;
    const sample = () => {
      if (busy || generation.current !== run) return;
      busy = true;
      navigator.geolocation.getCurrentPosition(async position => {
        if (generation.current !== run) return;
        const point = coordinates(position.coords.latitude, position.coords.longitude);
        try {
          if (!point) throw new Error('The device returned an invalid GPS location.');
          const abort = new AbortController();
          controller.current = abort;
          const timeout = setTimeout(() => abort.abort(), 10000);
          let response;
          try {
            response = await fetch(`/api/pro/visits/${encodeURIComponent(visitId)}/location`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...point, accuracy: position.coords.accuracy }), signal: abort.signal,
            });
          } finally { clearTimeout(timeout); }
          const data = await response.json();
          if (generation.current !== run) return;
          if (!response.ok || !data.success) {
            if ([401, 403, 409].includes(response.status)) {
              setGpsError(data.error || 'Location sharing stopped. Refresh the appointment.');
              stopJourney(); return;
            }
            throw new Error(data.error || 'Location upload failed. Retrying…');
          }
          setGpsError(position.coords.accuracy > 100 ? 'GPS accuracy is low. Move to an open area; automatic arrival is paused.' : null);
          setCurrentGps(data);
          callback.current(data);
        } catch (error) {
          if (generation.current === run) {
            setGpsError(error instanceof Error && error.name !== 'AbortError' ? error.message : 'Location upload timed out. Retrying…');
          }
        } finally { busy = false; }
      }, error => {
        if (generation.current !== run) return;
        busy = false;
        if (error.code === 1) stopJourney();
        setGpsError(error.code === 1 ? 'Location permission denied. Allow location access in your browser and try again.'
          : 'Unable to get GPS. Keep this page open and check location access; retrying…');
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
    };
    setIsTracking(true);
    timer.current = setInterval(sample, 5000);
    sample();
  };

  useEffect(() => {
    if (!['CONFIRMED', 'ON_THE_WAY', 'ARRIVED'].includes(status)) stopJourney();
  }, [status]);
  useEffect(() => () => {
    generation.current++;
    if (timer.current) clearInterval(timer.current);
    controller.current?.abort();
  }, [visitId]);
  return { isTracking, gpsError, currentGps, startJourney, stopJourney };
}
