'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, 
  MapPin, 
  ShieldCheck, 
  Zap, 
  Maximize2, 
  Crosshair, 
  Plus, 
  Minus,
  RotateCcw,
  Compass
} from 'lucide-react';
import { useMap } from 'react-leaflet';
import { calculateDistanceKm, estimateTravelMinutes } from '@/lib/geo';

// Dynamic import for react-leaflet components to disable SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then((mod) => mod.Tooltip),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

interface LiveTelemetryMapProps {
  clinicianName?: string;
  clinicianRole?: string;
  patientAddress?: string;
  initialLat?: number;
  initialLng?: number;
  destLat?: number;
  destLng?: number;
  status?: string;
  onArrived?: () => void;
}

// Controller component to smoothly manipulate the Leaflet map instance
function MapViewController({
  clinicianPos,
  destPos,
  focusMode,
}: {
  clinicianPos: [number, number];
  destPos: [number, number];
  focusMode: 'FIT' | 'PATIENT' | 'CLINICIAN';
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (focusMode === 'PATIENT') {
      map.flyTo(destPos, 16, { animate: true, duration: 1 });
    } else if (focusMode === 'CLINICIAN') {
      map.flyTo(clinicianPos, 16, { animate: true, duration: 1 });
    } else {
      // Fit both with generous padding for HUD overlay
      import('leaflet').then((L) => {
        const bounds = L.latLngBounds([clinicianPos, destPos]);
        map.fitBounds(bounds, {
          paddingTopLeft: [40, 110],
          paddingBottomRight: [40, 60],
          maxZoom: 16,
          animate: true,
        });
      });
    }
  }, [map, focusMode, destPos[0], destPos[1]]);

  return null;
}

export default function LiveTelemetryMap({
  clinicianName = 'Assigned Clinician',
  clinicianRole = 'Healthcare Professional',
  patientAddress = '12th Main, Indiranagar, Bengaluru',
  initialLat = 12.7918,
  initialLng = 79.8283,
  destLat = 12.8222,
  destLng = 79.7072,
  status = 'ON_THE_WAY',
  onArrived,
}: LiveTelemetryMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [clinicianPos, setClinicianPos] = useState<[number, number]>([initialLat, initialLng]);
  const [step, setStep] = useState(0);
  const [etaMinutes, setEtaMinutes] = useState(14);
  const [speedKmh, setSpeedKmh] = useState(34);
  const [focusMode, setFocusMode] = useState<'FIT' | 'PATIENT' | 'CLINICIAN'>('FIT');
  const [customIcons, setCustomIcons] = useState<{
    docIcon: any;
    destIcon: any;
  } | null>(null);

  // Sync position when coordinates change
  useEffect(() => {
    setClinicianPos([initialLat, initialLng]);
    setStep(0);
    setFocusMode('FIT');
  }, [initialLat, initialLng, destLat, destLng]);

  // Initialize Leaflet icons safely on client
  useEffect(() => {
    setIsMounted(true);

    import('leaflet').then((L) => {
      const docIcon = L.divIcon({
        className: 'custom-leaflet-doc-icon',
        html: `
          <div style="position:relative; width:46px; height:46px; display:flex; align-items:center; justify-content:center; background:#0f766e; border:3px solid #ffffff; border-radius:50%; box-shadow: 0 4px 16px rgba(15, 118, 110, 0.55); animation: pulse-ring 2s infinite;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          </div>
        `,
        iconSize: [46, 46],
        iconAnchor: [23, 23],
        popupAnchor: [0, -23],
      });

      const destIcon = L.divIcon({
        className: 'custom-leaflet-dest-icon',
        html: `
          <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center; background:#e11d48; border:3px solid #ffffff; border-radius:50%; box-shadow: 0 4px 16px rgba(225, 29, 72, 0.55);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22],
      });

      setCustomIcons({ docIcon, destIcon });
    });
  }, []);

  // Set clinician position based on actual DB coordinates and visit status
  useEffect(() => {
    if (status === 'ARRIVED' || status === 'IN_PROGRESS' || status === 'COMPLETED') {
      setClinicianPos([destLat, destLng]);
      setEtaMinutes(0);
      setSpeedKmh(0);
    } else {
      setClinicianPos([initialLat, initialLng]);
      const dist = calculateDistanceKm(initialLat, initialLng, destLat, destLng);
      setEtaMinutes(estimateTravelMinutes(dist));
      setSpeedKmh(status === 'ON_THE_WAY' ? 32 : 0);
    }
  }, [initialLat, initialLng, destLat, destLng, status]);

  const waypoints: [number, number][] = [
    [initialLat, initialLng],
    [destLat, destLng],
  ];

  if (!isMounted || !customIcons) {
    return (
      <div className="w-full h-96 bg-slate-900/60 rounded-3xl flex flex-col items-center justify-center text-slate-400 border border-slate-800 animate-pulse">
        <Navigation className="w-8 h-8 text-teal-400 animate-spin mb-3" />
        <p className="text-sm font-medium">Initializing Free Live OpenStreetMap Telemetry...</p>
      </div>
    );
  }

  const mapCenter: [number, number] = [
    (clinicianPos[0] + destLat) / 2,
    (clinicianPos[1] + destLng) / 2,
  ];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950 group">
      
      {/* Live HUD Floating Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md p-3 px-4 rounded-2xl border border-slate-700/80 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Live GPS Telemetry (OpenStreetMap)</div>
            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>{clinicianName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-medium border border-teal-500/30">
                {clinicianRole}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 shadow-xs">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>ETA: <strong className="text-white text-sm font-bold">{etaMinutes} mins</strong></span>
          </div>
          <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 shadow-xs">
            <span>Speed: <strong className="text-emerald-400 text-sm font-mono font-bold">{speedKmh} km/h</strong></span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-emerald-400 font-semibold text-xs bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            <span>Live Stream</span>
          </div>
        </div>
      </div>

      {/* Floating Interactive Map Controls */}
      <div className="absolute top-24 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setFocusMode('FIT')}
          title="Fit full route in screen"
          className={`p-2.5 rounded-2xl shadow-lg border backdrop-blur-md transition-all flex items-center gap-1.5 text-xs font-bold ${
            focusMode === 'FIT'
              ? 'bg-teal-700 text-white border-teal-600 shadow-teal-700/30'
              : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Maximize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Fit Route</span>
        </button>

        <button
          onClick={() => setFocusMode('PATIENT')}
          title="Zoom to Patient Home"
          className={`p-2.5 rounded-2xl shadow-lg border backdrop-blur-md transition-all flex items-center gap-1.5 text-xs font-bold ${
            focusMode === 'PATIENT'
              ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30'
              : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4 text-rose-400" />
          <span className="hidden sm:inline">My Home</span>
        </button>

        <button
          onClick={() => setFocusMode('CLINICIAN')}
          title="Zoom to Clinician Vehicle"
          className={`p-2.5 rounded-2xl shadow-lg border backdrop-blur-md transition-all flex items-center gap-1.5 text-xs font-bold ${
            focusMode === 'CLINICIAN'
              ? 'bg-teal-700 text-white border-teal-600 shadow-teal-700/30'
              : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Navigation className="w-4 h-4 text-teal-300" />
          <span className="hidden sm:inline">Doctor</span>
        </button>
      </div>

      {/* Leaflet React Map Container with full zoom & drag capabilities */}
      <div className="w-full h-[430px] relative z-0">
        <MapContainer
          center={mapCenter}
          zoom={13}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          dragging={true}
          touchZoom={true}
          zoomControl={true}
          style={{ height: '100%', width: '100%' }}
        >
          <MapViewController
            clinicianPos={clinicianPos}
            destPos={[destLat, destLng]}
            focusMode={focusMode}
          />

          {/* 100% Free OpenStreetMap Tile Engine with road labels and zero API key requirement */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Clinician Moving Marker */}
          <Marker position={clinicianPos} icon={customIcons.docIcon}>
            <Tooltip permanent direction="top" offset={[0, -24]} className="custom-leaflet-tooltip font-bold text-xs">
              🩺 {clinicianName} (ETA {etaMinutes}m)
            </Tooltip>
            <Popup>
              <div className="p-1 text-slate-900 text-xs">
                <strong className="block text-teal-700 font-bold">{clinicianName}</strong>
                <span>En route to patient residence</span>
                <div className="mt-1 text-[11px] text-slate-500 font-mono">
                  GPS: {clinicianPos[0].toFixed(5)}, {clinicianPos[1].toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Patient Destination Marker */}
          <Marker position={[destLat, destLng]} icon={customIcons.destIcon}>
            <Tooltip permanent direction="top" offset={[0, -22]} className="custom-leaflet-tooltip font-bold text-xs">
              🏡 Patient Residence
            </Tooltip>
            <Popup>
              <div className="p-1 text-slate-900 text-xs">
                <strong className="block text-rose-600 font-bold">Patient Doorstep Destination</strong>
                <span>{patientAddress}</span>
                <div className="mt-1 text-[11px] text-slate-500 font-mono">
                  GPS: {destLat.toFixed(5)}, {destLng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Route Polylines */}
          <Polyline
            positions={waypoints}
            color="#0f766e"
            weight={5}
            opacity={0.85}
            dashArray="7, 9"
          />
        </MapContainer>
      </div>

      {/* Footer Info Strip */}
      <div className="p-3.5 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="truncate max-w-xs sm:max-w-md font-medium text-slate-200">{patientAddress}</span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-3">
          <span>Scroll/Pinch to Zoom 🔍</span>
          <span className="font-mono text-teal-400">
            {clinicianPos[0].toFixed(4)}, {clinicianPos[1].toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
}
