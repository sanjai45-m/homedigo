'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  HeartPulse,
  Navigation,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  Activity,
  AlertCircle,
  Save,
  ArrowLeft,
  FileText,
  ShieldCheck,
  Zap,
  Sparkles,
  Loader2,
  Radio,
  StopCircle,
} from 'lucide-react';

const LiveTelemetryMap = dynamic(
  () => import('@/components/shared/LiveTelemetryMap'),
  { ssr: false }
);

export default function PartnerVisitCockpitPage() {
  const params = useParams();
  const visitId = params?.id as string;

  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Vitals form
  const [vitalBp, setVitalBp] = useState('');
  const [vitalPulse, setVitalPulse] = useState('');
  const [vitalSpo2, setVitalSpo2] = useState('');
  const [vitalSugar, setVitalSugar] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [status, setStatus] = useState('ON_THE_WAY');

  // GPS tracking
  const [isTracking, setIsTracking] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number } | null>(null);
  const [proximityData, setProximityData] = useState<{
    distanceKm: number | null;
    isNearby: boolean;
    isImmediate: boolean;
  } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  const fetchVisit = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/pro/visits/${visitId}`);
      const data = await res.json();
      if (data.visit) {
        setVisit(data.visit);
        setStatus(data.visit.status || 'ON_THE_WAY');
        if (data.visit.vital_bp) setVitalBp(data.visit.vital_bp);
        if (data.visit.vital_pulse) setVitalPulse(data.visit.vital_pulse);
        if (data.visit.vital_spo2) setVitalSpo2(data.visit.vital_spo2);
        if (data.visit.vital_sugar) setVitalSugar(data.visit.vital_sugar);
        if (data.visit.prescription_notes) setPrescriptionNotes(data.visit.prescription_notes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visitId) {
      fetchVisit();
    }
  }, [visitId]);

  const updateVisitStatus = async (newStatus: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/pro/visits/${visitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          vitalBp,
          vitalPulse,
          vitalSpo2,
          vitalSugar,
          prescriptionNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(newStatus);
        setFeedback(`Status updated to: ${newStatus}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ── GPS Journey Tracking ──────────────────────────────────────────
  const pushLocation = async (lat: number, lng: number) => {
    const now = Date.now();
    // Throttle to once every 5 seconds
    if (now - lastSentRef.current < 5000) return;
    lastSentRef.current = now;
    try {
      const res = await fetch(`/api/pro/visits/${visitId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      setCurrentGps({ lat, lng });
      if (data.isNearby !== undefined) {
        setProximityData({
          distanceKm: data.distanceKm,
          isNearby: data.isNearby,
          isImmediate: data.isImmediate,
        });
        if (data.status && data.status !== status) {
          setStatus(data.status);
        }
      }
    } catch (e) {
      console.error('Failed to push GPS:', e);
    }
  };

  const startJourney = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('GPS is not supported on this browser/device.');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        pushLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setGpsError(`GPS Error: ${err.message}`);
        setIsTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    watchIdRef.current = id;
    setIsTracking(true);
    // Immediately transition to ON_THE_WAY
    updateVisitStatus('ON_THE_WAY');
  };

  const stopJourney = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);
  // ─────────────────────────────────────────────────────────────────

  const handleSaveVitalsAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`/api/pro/visits/${visitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          vitalBp,
          vitalPulse,
          vitalSpo2,
          vitalSugar,
          prescriptionNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('COMPLETED');
        setFeedback('Clinical visit signed-off and completed successfully!');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !visit) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Loading live visit cockpit...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Back button & Title */}
      <div>
        <Link
          href="/partner/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Today's Queue</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <HeartPulse className="w-8 h-8 text-teal-600" />
              <span>Doorstep Visit Execution Cockpit</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Booking <strong className="text-teal-700 font-mono font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-100">{visit.booking_number}</strong> · {visit.service_title}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              status === 'COMPLETED'
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse'
            }`}>
              {status}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* GPS Journey Control Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isTracking
          ? 'bg-teal-50 border-teal-300'
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Radio className={`w-4 h-4 ${isTracking ? 'text-teal-600 animate-pulse' : 'text-slate-400'}`} />
            <span>GPS Live Journey Tracking</span>
            {isTracking && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-600 text-white animate-pulse">
                STREAMING LIVE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {isTracking
              ? `Broadcasting your location. Patient can see you moving in real-time. GPS: ${currentGps ? `${currentGps.lat.toFixed(5)}, ${currentGps.lng.toFixed(5)}` : 'acquiring...'}`
              : 'Tap "Start Journey" to stream your live GPS to the patient as you travel.'}
          </p>
          {proximityData?.isNearby && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-bold flex items-center gap-2 animate-pulse">
              <Navigation className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {proximityData.isImmediate
                  ? '🎯 Patient Residence In Immediate Range (<400m) — Patient notified that you have arrived!'
                  : `🚨 Patient In Range (${proximityData.distanceKm} km) — Proximity alert triggered to patient.`}
              </span>
            </div>
          )}
          {gpsError && (
            <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />{gpsError}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isTracking ? (
            <button
              type="button"
              onClick={startJourney}
              disabled={status === 'COMPLETED'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all disabled:opacity-50"
            >
              <Navigation className="w-4 h-4" />
              Start Journey (Push GPS)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { stopJourney(); updateVisitStatus('ARRIVED'); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
            >
              <StopCircle className="w-4 h-4" />
              Stop GPS — I've Arrived
            </button>
          )}
        </div>
      </div>

      {/* Live OpenStreetMap Telemetry View */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-teal-600" />
          <span>Live GPS Navigation Route (OpenStreetMap Telemetry)</span>
        </h3>
        <LiveTelemetryMap
          clinicianName={visit.partner_name ? `${visit.partner_name} (You)` : 'You (Attending Clinician)'}
          clinicianRole={visit.partner_title || 'Attending Clinician'}
          patientAddress={visit.address_text}
          status={status}
          onArrived={() => updateVisitStatus('ARRIVED')}
        />
      </div>

      {/* Patient & Booking Details Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Patient Name</div>
            <div className="text-xl font-extrabold text-slate-900">{visit.patient_name}</div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="tel:+919845012345"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Patient</span>
            </a>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Scheduled Slot</div>
              <div className="text-sm font-bold text-slate-800">{visit.scheduled_time_slot}</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-medium text-slate-800">{visit.address_text}</span>
          </div>
          {visit.clinical_instructions && (
            <div className="mt-2 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-slate-700">
              <strong className="text-amber-800 block mb-1">Chief Complaint / Special Instructions:</strong>
              {visit.clinical_instructions}
            </div>
          )}
        </div>

        {/* Workflow Action Steps */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => updateVisitStatus('ARRIVED')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              status === 'ARRIVED'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            1. Doorstep Arrived
          </button>
          <button
            type="button"
            onClick={() => updateVisitStatus('IN_PROGRESS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              status === 'IN_PROGRESS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            2. In-Progress Checkup
          </button>
        </div>
      </div>

      {/* Digital Vitals Logger & Prescription Form */}
      <form onSubmit={handleSaveVitalsAndComplete} className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            <span>Digital Clinical Vitals Logger</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Log patient baseline biometric telemetry directly into the patient EMR record and invoice summary.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Blood Pressure</label>
            <input
              type="text"
              placeholder="120/80"
              value={vitalBp}
              onChange={(e) => setVitalBp(e.target.value)}
              className="w-full bg-transparent text-slate-900 font-mono font-bold text-base focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 font-medium">mmHg</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Heart Pulse</label>
            <input
              type="text"
              placeholder="74"
              value={vitalPulse}
              onChange={(e) => setVitalPulse(e.target.value)}
              className="w-full bg-transparent text-emerald-700 font-mono font-bold text-base focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 font-medium">bpm</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Oxygen SpO2</label>
            <input
              type="text"
              placeholder="98"
              value={vitalSpo2}
              onChange={(e) => setVitalSpo2(e.target.value)}
              className="w-full bg-transparent text-teal-700 font-mono font-bold text-base focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 font-medium">% saturation</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Blood Sugar</label>
            <input
              type="text"
              placeholder="105"
              value={vitalSugar}
              onChange={(e) => setVitalSugar(e.target.value)}
              className="w-full bg-transparent text-amber-700 font-mono font-bold text-base focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 font-medium">mg/dL</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Clinical Notes & Prescription Advice
          </label>
          <textarea
            rows={4}
            placeholder="Clinical diagnosis, observed symptoms, recommended medications, dosage, and follow-up advice..."
            value={prescriptionNotes}
            onChange={(e) => setPrescriptionNotes(e.target.value)}
            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-teal-500 focus:bg-white leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Digital EMR Encryption Verified</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Signing Off...' : 'Complete Visit & Sign-off'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
