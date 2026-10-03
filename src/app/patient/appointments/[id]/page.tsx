'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Navigation, 
  Star, 
  PhoneCall, 
  ShieldCheck, 
  Activity, 
  FileText, 
  Download, 
  Share2, 
  Sparkles,
  RefreshCw,
  FileBadge,
  Check,
  Loader2
} from 'lucide-react';
import { generateInvoicePdf } from '@/lib/pdf-generator';

const LiveTelemetryMap = dynamic(
  () => import('@/components/shared/LiveTelemetryMap'),
  { ssr: false }
);

export default function AppointmentDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'VITALS' | 'INVOICE'>('TELEMETRY');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  // Live partner GPS position polled from server
  const [partnerLivePos, setPartnerLivePos] = useState<{ lat: number; lng: number } | null>(null);
  // Proximity info from location API
  const [proximityInfo, setProximityInfo] = useState<{
    distanceKm: number | null;
    isNearby: boolean;
    isImmediate: boolean;
    etaMins: number | null;
  } | null>(null);
  const [hasChimed, setHasChimed] = useState(false);

  const playProximityChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  useEffect(() => {
    async function loadBooking() {
      try {
        const res = await fetch(`/api/patient/bookings/${id}`);
        const data = await res.json();
        if (data.booking) {
          setBooking(data.booking);
        }
      } catch (err) {
        console.error('Error loading booking detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBooking();
  }, [id]);

  // Poll partner GPS every 5 seconds while visit is active
  useEffect(() => {
    if (!id) return;
    const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED'];

    const poll = async () => {
      try {
        const res = await fetch(`/api/pro/visits/${id}/location`);
        const data = await res.json();
        if (data.lat !== null && data.lng !== null) {
          setPartnerLivePos({ lat: data.lat, lng: data.lng });
        }
        if (data.isNearby !== undefined) {
          setProximityInfo({
            distanceKm: data.distanceKm,
            isNearby: data.isNearby,
            isImmediate: data.isImmediate,
            etaMins: data.etaMins,
          });
          if (data.isNearby && !hasChimed) {
            playProximityChime();
            setHasChimed(true);
          }
        }
        // Update booking status dynamically from server
        if (data.status) {
          setBooking((prev: any) =>
            prev ? { ...prev, status: data.status } : prev
          );
          if (TERMINAL_STATUSES.includes(data.status)) {
            clearInterval(intervalId);
          }
        }
      } catch {}
    };

    const intervalId = setInterval(poll, 5000);
    poll(); // immediate first call
    return () => clearInterval(intervalId);
  }, [id, hasChimed]);

  const updateBookingStatus = async (newStatus: string) => {
    setUpdatingStatus(newStatus);
    try {
      const res = await fetch(`/api/patient/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.booking) {
        setBooking((prev: any) => ({ ...prev, ...data.booking }));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-md" />
            <div className="h-4 w-32 bg-slate-100 rounded-md" />
          </div>
        </div>

        {/* Progress Tracker Skeleton */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-10 w-80 bg-slate-200 rounded-xl" />
            <div className="h-[400px] bg-slate-200 rounded-3xl" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="h-48 bg-slate-200 rounded-3xl" />
            <div className="h-48 bg-slate-200 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <p>No active booking found with ID: #{id}</p>
        <Link
          href="/patient/appointments"
          className="inline-block px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors"
        >
          Back to Appointments
        </Link>
      </div>
    );
  }

  const b = booking;

  const steps = [
    { key: 'PENDING', label: 'Awaiting Doctor' },
    { key: 'ASSIGNED', label: 'Clinician Assigned' },
    { key: 'CONFIRMED', label: 'Doctor Confirmed' },
    { key: 'ON_THE_WAY', label: 'On The Way' },
    { key: 'ARRIVED', label: 'Arrived at Doorstep' },
    { key: 'IN_PROGRESS', label: 'Care In Progress' },
    { key: 'COMPLETED', label: 'Visit Completed' },
  ];

  const currentStepIdx = steps.findIndex((s) => s.key === b.status);
  const activeStepIdx = currentStepIdx;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/patient/appointments"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-heading text-slate-900 tracking-tight">
                {b.service_title}
              </h1>
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                #{b.booking_number}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Patient: <span className="font-bold text-slate-800">{b.patient_name}</span> · Scheduled: {b.scheduled_date}, {b.scheduled_time_slot}
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>Live Status: {b.status.replace(/_/g, ' ')}</span>
          </span>
        </div>
      </div>

      {/* PROXIMITY NOTIFICATION TRIGGER CARD */}
      {(proximityInfo?.isNearby || b.status === 'ARRIVED' || (proximityInfo?.distanceKm !== null && proximityInfo?.distanceKm !== undefined && proximityInfo.distanceKm <= 3.0)) && (
        <div className={`p-5 rounded-3xl border shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300 ${
          b.status === 'ARRIVED' || (proximityInfo?.distanceKm !== null && proximityInfo?.distanceKm !== undefined && proximityInfo.distanceKm <= 0.3)
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-400 ring-4 ring-emerald-500/20'
            : 'bg-gradient-to-r from-amber-500 via-teal-600 to-emerald-600 text-white border-amber-300 ring-4 ring-amber-500/20'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 animate-bounce shadow-inner">
              <Navigation className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider">
                  {b.status === 'ARRIVED' || (proximityInfo?.distanceKm !== null && proximityInfo?.distanceKm !== undefined && proximityInfo.distanceKm <= 0.3)
                    ? '🎯 Doctor Has Arrived!'
                    : '🚨 Doctor In Your Range!'}
                </span>
                {proximityInfo?.distanceKm !== null && proximityInfo?.distanceKm !== undefined && (
                  <span className="text-xs font-mono font-bold text-white/90 bg-black/20 px-2 py-0.5 rounded-md">
                    {proximityInfo.distanceKm} km away
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-white">
                {b.status === 'ARRIVED' || (proximityInfo?.distanceKm !== null && proximityInfo?.distanceKm !== undefined && proximityInfo.distanceKm <= 0.3)
                  ? `${b.partner_name || 'Your Clinician'} has arrived outside your home!`
                  : `${b.partner_name || 'Your Clinician'} is currently in your neighborhood / range!`}
              </h3>
              <p className="text-xs text-white/90 font-medium">
                {b.status === 'ARRIVED' || (proximityInfo?.distanceKm !== null && proximityInfo?.distanceKm !== undefined && proximityInfo.distanceKm <= 0.3)
                  ? 'Please open your main entrance door. Your clinician is at your doorstep for the home visit.'
                  : `Doctor is approaching your address (ETA ~${proximityInfo?.etaMins || 2} mins). Please prepare the patient area.`}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end shrink-0">
            <a
              href={`tel:${b.partner_phone || '9876543210'}`}
              className="px-4 py-2.5 rounded-xl bg-white text-teal-900 font-bold text-xs shadow-md hover:bg-teal-50 transition-colors flex items-center gap-2"
            >
              <PhoneCall className="w-4 h-4 text-teal-700" />
              <span>Call Doctor Direct</span>
            </a>
          </div>
        </div>
      )}

      {/* Progress Timeline Stepper */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 font-heading">
            Live Booking Lifecycle Progress
          </h2>
          <span className="text-xs text-slate-500 font-semibold">
            Automated State Machine
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {steps.map((step, idx) => {
            const isPassed = activeStepIdx >= idx;
            const isCurrent = activeStepIdx === idx;
            return (
              <div key={step.key} className="space-y-2 text-center">
                <div className={`h-2 rounded-full transition-all duration-300 ${isPassed ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                <div className="flex items-center justify-center gap-1">
                  {isPassed && <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />}
                  <span className={`text-[11px] font-bold block truncate ${isCurrent ? 'text-teal-600' : isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Status Simulation Bar */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Interactive State Simulator:</span>
          </span>

          <div className="flex flex-wrap gap-1.5">
            {['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].map((st) => {
              const isThisUpdating = updatingStatus === st;
              return (
                <button
                  key={st}
                  onClick={() => updateBookingStatus(st)}
                  disabled={Boolean(updatingStatus)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    b.status === st
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-50'
                  }`}
                >
                  {isThisUpdating && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Set: {st.replace(/_/g, ' ')}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('TELEMETRY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'TELEMETRY' ? 'bg-teal-700 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              📍 Free Live Map GPS Telemetry
            </button>
            <button
              onClick={() => setActiveTab('VITALS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'VITALS' ? 'bg-teal-700 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              🩺 Clinical Vitals & Digital Rx
            </button>
            <button
              onClick={() => setActiveTab('INVOICE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'INVOICE' ? 'bg-teal-700 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              🧾 GST Tax Invoice
            </button>
          </div>

          {/* 1. FREE LIVE MAP & TELEMETRY */}
          {activeTab === 'TELEMETRY' && (
            <div className="space-y-4">
              {(() => {
                const destLat = b.patient_lat ? Number(b.patient_lat) : 12.9716;
                const destLng = b.patient_lng ? Number(b.patient_lng) : 77.5946;
                // Use live polled GPS first, then fall back to DB stored partner_lat/lng
                const liveLat = partnerLivePos?.lat ?? (b.partner_lat ? Number(b.partner_lat) : null);
                const liveLng = partnerLivePos?.lng ?? (b.partner_lng ? Number(b.partner_lng) : null);
                const initialLat = liveLat ?? (destLat - 0.02);
                const initialLng = liveLng ?? (destLng - 0.02);

                return (
                  <LiveTelemetryMap
                    clinicianName={b.partner_name || 'Assigned Clinician'}
                    clinicianRole={b.partner_title || 'Attending Physician'}
                    patientAddress={b.address_text}
                    initialLat={initialLat}
                    initialLng={initialLng}
                    destLat={destLat}
                    destLng={destLng}
                    status={b.status}
                  />
                );
              })()}
            </div>
          )}



          {/* 2. VITALS & RX STAGE */}
          {activeTab === 'VITALS' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  <span>Recorded Clinical Vitals & Notes</span>
                </h3>
                {b.vital_bp || b.vital_pulse || b.vital_spo2 || b.vital_sugar || b.prescription_notes ? (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    ✓ Clinician Authenticated
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    ⏳ Pending Clinical Examination
                  </span>
                )}
              </div>

              {/* Vitals Biometrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 text-center">
                  <span className="text-[10px] font-bold text-teal-700 uppercase block">Blood Pressure</span>
                  <span className="text-xl font-black text-slate-900 font-heading mt-1 block">
                    {b.vital_bp || '--'}
                  </span>
                  {!b.vital_bp && <span className="text-[10px] text-slate-400">Not recorded yet</span>}
                </div>
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 text-center">
                  <span className="text-[10px] font-bold text-rose-600 uppercase block">Pulse Rate</span>
                  <span className="text-xl font-black text-slate-900 font-heading mt-1 block">
                    {b.vital_pulse || '--'}
                  </span>
                  {!b.vital_pulse && <span className="text-[10px] text-slate-400">Not recorded yet</span>}
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Oxygen SpO2</span>
                  <span className="text-xl font-black text-slate-900 font-heading mt-1 block">
                    {b.vital_spo2 || '--'}
                  </span>
                  {!b.vital_spo2 && <span className="text-[10px] text-slate-400">Not recorded yet</span>}
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-center">
                  <span className="text-[10px] font-bold text-amber-600 uppercase block">Blood Sugar</span>
                  <span className="text-xl font-black text-slate-900 font-heading mt-1 block">
                    {b.vital_sugar || '--'}
                  </span>
                  {!b.vital_sugar && <span className="text-[10px] text-slate-400">Not recorded yet</span>}
                </div>
              </div>

              {/* Prescription Notes */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileBadge className="w-4 h-4 text-teal-600" />
                  <span>Clinical Advice & Digital Prescription</span>
                </h4>
                {b.prescription_notes ? (
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {b.prescription_notes}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic font-normal">
                    Digital prescription and doctor's instructions will be entered by the attending clinician during or upon completion of the visit.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 3. INVOICE STAGE */}
          {activeTab === 'INVOICE' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">Itemized Tax Invoice</h3>
                  <p className="text-xs text-slate-500">Invoice: INV-{(b.booking_number || b.id || '').toUpperCase()} · Paid via UPI</p>
                </div>
                <button
                  onClick={() => alert('Downloading PDF invoice...')}
                  className="px-3.5 py-2 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">{b.service_title} Consultation Fee</span>
                  <span className="font-bold text-slate-900">₹{(b.total_amount / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Visiting & Sterile Material Consumables</span>
                  <span className="font-bold text-slate-900">Included</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Integrated GST (18%)</span>
                  <span className="font-bold text-slate-900">₹{(b.total_amount - b.total_amount / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-black text-slate-900 font-heading">
                  <span>Total Paid (UPI)</span>
                  <span className="text-teal-700">₹{b.total_amount}.00</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Matched Clinician Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
            
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Assigned Healthcare Professional
            </div>

            <div className="flex items-center gap-3.5">
              <img
                src={b.partner_img || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&q=80'}
                alt={b.partner_name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-teal-500/20 shadow-xs"
              />
              <div>
                <h4 className="text-base font-bold text-slate-900 font-heading">{b.partner_name}</h4>
                <p className="text-xs text-slate-500 font-medium">{b.partner_title}</p>
                <div className="flex items-center gap-1 mt-1 text-amber-500 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{b.partner_rating || 4.9}</span>
                  <span className="text-slate-400 text-[10px] font-normal">(142 visits)</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Medical License & Govt KYC Verified</span>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href="tel:+919845012345"
                className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-700/20 transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Assigned Clinician</span>
              </a>

              <button
                onClick={() => alert('Sharing tracking link with family member...')}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Live Tracking Link</span>
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
