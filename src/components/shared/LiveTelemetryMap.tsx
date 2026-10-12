'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet';
import type { DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { coordinates, distanceKm, locationIsFresh } from '@/lib/tracking';

type Position = [number, number];
type Focus = 'FIT' | 'PATIENT' | 'CLINICIAN';
interface LiveTelemetryMapProps {
  clinicianName?: string;
  clinicianRole?: string;
  patientAddress?: string;
  initialLat?: number | null;
  initialLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
  status?: string;
  updatedAt?: string | null;
  live?: boolean;
}

function MapViewController({ doctor, patient, focus, revision }: {
  doctor: Position | null; patient: Position | null; focus: Focus; revision: number;
}) {
  const map = useMap();
  const doctorLat = doctor?.[0], doctorLng = doctor?.[1];
  const patientLat = patient?.[0], patientLng = patient?.[1];
  useEffect(() => {
    const a: Position | null = doctorLat == null || doctorLng == null ? null : [doctorLat, doctorLng];
    const b: Position | null = patientLat == null || patientLng == null ? null : [patientLat, patientLng];
    if (focus === 'PATIENT' && b) map.setView(b, 16);
    else if (focus === 'CLINICIAN' && a) map.setView(a, 16);
    else if (a && b) map.fitBounds([a, b], { padding: [55, 55], maxZoom: 16 });
    else if (b || a) map.setView((b || a)!, 15);
  }, [map, focus, revision, doctorLat, doctorLng, patientLat, patientLng]);
  return null;
}

export default function LiveTelemetryMap({ clinicianName = 'Assigned clinician', clinicianRole = 'Healthcare professional',
  patientAddress = '', initialLat, initialLng, destLat, destLng, status, updatedAt, live = false,
}: LiveTelemetryMapProps) {
  const [icons, setIcons] = useState<{ doctor: DivIcon; patient: DivIcon } | null>(null);
  const [focus, setFocus] = useState<Focus>('FIT');
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let active = true;
    import('leaflet').then(L => {
      const icon = (kind: string, color: string, label: string) => L.divIcon({
        className: `custom-leaflet-${kind}-icon`,
        html: `<div style="width:40px;height:40px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px #0005;color:white;display:grid;place-items:center;font-size:22px" aria-label="${label}">${kind === 'doc' ? '+' : '⌂'}</div>`,
        iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20],
      });
      if (active) setIcons({ doctor: icon('doc', '#0f766e', 'Doctor'), patient: icon('dest', '#e11d48', 'Patient') });
    });
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const doctorCoords = coordinates(initialLat, initialLng), patientCoords = coordinates(destLat, destLng);
  const doctor: Position | null = doctorCoords ? [doctorCoords.lat, doctorCoords.lng] : null;
  const patient: Position | null = patientCoords ? [patientCoords.lat, patientCoords.lng] : null;
  const isLive = Boolean(doctor && live && locationIsFresh(updatedAt, now) && ['ON_THE_WAY', 'ARRIVED'].includes(status || ''));
  const distance = doctorCoords && patientCoords ? distanceKm(doctorCoords, patientCoords) : null;
  const label = isLive ? 'Live location' : doctor ? 'Last known location · not live' : 'Waiting for doctor GPS';
  const chooseFocus = (value: Focus) => { setFocus(value); setRevision(value => value + 1); };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
        <div><p className="font-bold">{clinicianName}</p><p className="text-xs text-slate-300">{clinicianRole}</p></div>
        <p role="status" className={`text-sm font-semibold ${isLive ? 'text-emerald-300' : 'text-amber-200'}`}>{label}</p>
        {isLive && distance !== null && <p className="text-xs">Approx. {Math.max(1, Math.round(distance / 25 * 60))} min · estimate only</p>}
      </div>
      {!patient && <p role="alert" className="bg-amber-50 p-3 text-sm text-amber-900">Patient location is missing. Confirm the visit address with the patient; distance and arrival detection are unavailable.</p>}
      {!doctor && <p className="p-3 text-sm text-slate-600">The doctor’s marker will appear after they start sharing GPS.</p>}
      {doctor || patient ? <>
        <div className="flex flex-wrap gap-2 p-3 text-xs font-semibold">
          <button type="button" onClick={() => chooseFocus('FIT')} className="rounded-lg border px-3 py-2">Show both</button>
          <button type="button" onClick={() => chooseFocus('PATIENT')} disabled={!patient} className="rounded-lg border px-3 py-2 disabled:opacity-40">Patient location</button>
          <button type="button" onClick={() => chooseFocus('CLINICIAN')} disabled={!doctor} className="rounded-lg border px-3 py-2 disabled:opacity-40">Doctor location</button>
        </div>
        <div className="relative z-0 h-[430px]">
          {icons ? <MapContainer center={(patient || doctor)!} zoom={15} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
            <MapViewController doctor={doctor} patient={patient} focus={focus} revision={revision} />
            {doctor && <Marker position={doctor} icon={icons.doctor}>
              <Tooltip permanent direction="top" offset={[0, -20]}>{clinicianName}</Tooltip>
              <Popup><strong>{clinicianName}</strong><p>{label}</p><p>GPS: {doctor[0].toFixed(5)}, {doctor[1].toFixed(5)}</p></Popup>
            </Marker>}
            {patient && <Marker position={patient} icon={icons.patient}>
              <Tooltip permanent direction="top" offset={[0, -20]}>Patient residence</Tooltip>
              <Popup><strong>Patient destination</strong><p>{patientAddress}</p><p>GPS: {patient[0].toFixed(5)}, {patient[1].toFixed(5)}</p></Popup>
            </Marker>}
            {doctor && patient && <Polyline positions={[doctor, patient]} color="#0f766e" dashArray="7, 9" />}
          </MapContainer> : <p className="p-6 text-sm text-slate-500">Loading map…</p>}
        </div>
      </> : <p className="p-6 text-sm text-slate-600">The map will appear when a valid location is available.</p>}
      <div className="space-y-1 border-t p-3 text-xs text-slate-600">
        <p>{patientAddress || 'Visit address unavailable'}</p>
        {distance !== null && <p>{distance.toFixed(2)} km straight-line distance. The dashed line is not a road route.</p>}
        {updatedAt && <p>Last GPS update: {new Date(updatedAt).toLocaleTimeString()}</p>}
      </div>
    </div>
  );
}
