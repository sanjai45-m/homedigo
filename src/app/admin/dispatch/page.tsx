'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Radio,
  RefreshCw,
  UserCheck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  ArrowRight,
  ShieldAlert,
  Send,
  Sliders
} from 'lucide-react';

const LiveTelemetryMap = dynamic(
  () => import('@/components/shared/LiveTelemetryMap'),
  { ssr: false }
);

export default function AdminDispatchPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassignPartnerId, setReassignPartnerId] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchDispatchData = async () => {
    try {
      setLoading(true);
      const [dispatchRes, partnerRes] = await Promise.all([
        fetch('/api/admin/dispatch').then((r) => r.json()),
        fetch('/api/admin/partners').then((r) => r.json()),
      ]);

      if (dispatchRes.bookings) {
        setBookings(dispatchRes.bookings);
        if (dispatchRes.bookings.length > 0 && !selectedBooking) {
          setSelectedBooking(dispatchRes.bookings[0]);
        }
      }
      if (partnerRes.partners) {
        setPartners(partnerRes.partners);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatchData();
  }, []);

  const handleReassign = async () => {
    if (!selectedBooking || !reassignPartnerId) return;
    const targetPartner = partners.find((p) => p.id === reassignPartnerId);
    if (!targetPartner) return;

    try {
      const res = await fetch('/api/admin/dispatch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          partnerId: targetPartner.id,
          partnerName: targetPartner.name,
          partnerTitle: targetPartner.specialization,
          status: 'ASSIGNED',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback(`Reassigned booking ${selectedBooking.booking_number} to ${targetPartner.name}`);
        fetchDispatchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-3 py-0.5 rounded-full">
              Live Fleet Stream
            </span>
          </div>
          <h1 className="text-3xl font-black font-heading tracking-tight text-slate-900 mt-1">
            Live Dispatch & Telemetry Cockpit
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Real-time GPS vehicle tracking via OpenStreetMap, SLA escalation triggers, and one-click clinician reassignments.
          </p>
        </div>

        <button
          onClick={fetchDispatchData}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-600' : ''}`} />
          <span>Refresh Live Queue</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Bookings Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
              Active Dispatches ({bookings.length})
            </span>
            <span className="text-xs text-rose-600 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Live Stream
            </span>
          </div>

          <div className="space-y-3">
            {bookings.length > 0 ? (
              bookings.map((b) => {
                const isSelected = selectedBooking?.id === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className={`p-5 rounded-3xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-amber-50/50 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">
                          {b.booking_number || b.id}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 font-heading mt-1">{b.service_title}</h4>
                        <p className="text-xs text-slate-500 font-medium">Patient: {b.patient_name}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'ON_THE_WAY'
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span>{b.partner_name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{b.scheduled_time_slot}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                No active dispatches in queue.
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Map & Control Cockpit */}
        <div className="lg:col-span-7 space-y-6">
          {selectedBooking ? (
            <>
              {/* Free OpenStreetMap Live Component */}
              <LiveTelemetryMap
                clinicianName={selectedBooking.partner_name || 'Assigned Clinician'}
                clinicianRole={selectedBooking.partner_title || 'Attending Professional'}
                patientAddress={selectedBooking.address_text || 'Patient Location'}
                status={selectedBooking.status}
              />

              {/* Booking Actions & Reassignment Box */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-600" />
                      <span>Dispatch Reassignment & SLA Override</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Reassign this booking to another available on-duty doctor or nurse.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 text-xs font-bold mb-1">Select Available Doctor</label>
                    <select
                      value={reassignPartnerId}
                      onChange={(e) => setReassignPartnerId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-amber-500 font-medium"
                    >
                      <option value="">-- Choose On-Duty Clinician --</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.specialization}) - {p.availability}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleReassign}
                      disabled={!reassignPartnerId}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reassign Doctor</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              Select a booking from the active queue to view live GPS telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
