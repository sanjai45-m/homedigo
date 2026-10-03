'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CalendarCheck, 
  BellRing, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  UserCheck, 
  PauseCircle, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Lock, 
  ArrowRight,
  Smartphone,
  ChevronRight,
  MessageSquare
} from 'lucide-react';

export default function GovernanceSection() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const steps = [
    { 
      num: '1', 
      title: 'Partner Accepts Visit', 
      desc: 'Partner confirms booking request & reserves slot in clinical calendar.', 
      icon: CalendarCheck, 
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      ruleDetail: 'Slot locked in partner roster. Cancellation permitted up to 2 hours prior without strike.',
      messageSample: '📱 SMS: "HomeDigo: Visit #HD-8921 confirmed for Today 10:00 AM at Indiranagar."',
      actionTag: 'Roster Lock',
    },
    { 
      num: '2', 
      title: 'Automated Reminders', 
      desc: 'Dual automated alerts sent 24h & 1h prior to scheduled appointment.', 
      icon: BellRing, 
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      ruleDetail: 'Automated background cron triggers WhatsApp & Push notifications with address shortcut.',
      messageSample: '💬 WhatsApp: "Reminder: You have a scheduled Home Nursing visit at 10:00 AM (1 hr remaining)."',
      actionTag: 'Automated Cron',
    },
    { 
      num: '3', 
      title: 'Scheduled Time Window', 
      desc: 'Designated appointment window opens (e.g. 10:00 AM - 11:00 AM).', 
      icon: Clock, 
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      ruleDetail: 'Grace period counter of 15 minutes initiates for partner arrival.',
      messageSample: '🔔 Push: "Visit window has commenced. Please initiate travel if not yet on route."',
      actionTag: 'Timer Started',
    },
    { 
      num: '4', 
      title: 'Geofenced Check-In', 
      desc: 'Partner must trigger GPS check-in within 100m of patient address pin.', 
      icon: MapPin, 
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      ruleDetail: 'Device GPS coordinates matched against registered address coordinates via Haversine formula.',
      messageSample: '📍 System Log: "GPS Check-in Successful: Latitude 12.9716, Longitude 77.5946 (Within 45m)."',
      actionTag: 'GPS Verified',
    },
    { 
      num: '5', 
      title: 'Missed & Unexcused', 
      desc: 'Triggered if no check-in is logged after 15 mins and no reason was provided.', 
      icon: AlertTriangle, 
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      ruleDetail: 'Immediate automated dispatch of priority backup partner to prevent patient disruption.',
      messageSample: '⚠️ Alert: "Check-in window expired. Backup clinician being dispatched to patient."',
      actionTag: 'SLA Breach',
    },
    { 
      num: '6', 
      title: 'Suspected No-Show Flag', 
      desc: 'Incident case automatically logged in Admin Governance desk.', 
      icon: AlertTriangle, 
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      ruleDetail: 'Audit log created with full GPS telemetry, phone call logs, and timestamp history.',
      messageSample: '🛡️ Case #NS-401 generated for Operations Lead Review.',
      actionTag: 'Flagged',
    },
    { 
      num: '7', 
      title: 'Admin & Policy Review', 
      desc: 'Operations team inspects partner logs, emergency declarations & history.', 
      icon: UserCheck, 
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      ruleDetail: 'Admin verifies whether failure was caused by road accident, medical emergency, or neglect.',
      messageSample: '📋 Review Notes: "First violation in 124 visits. Evaluating submitted road block photo."',
      actionTag: 'Manual Audit',
    },
    { 
      num: '8', 
      title: 'Temporary Suspension', 
      desc: 'Configurable 2-3 day assignment pause applied if violation is unjustified.', 
      icon: PauseCircle, 
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      ruleDetail: 'Partner availability automatically forced to OFFLINE state for 72 hours.',
      messageSample: '⛔ Notification: "Account suspended from new assignments for 3 days due to unexcused no-show."',
      actionTag: 'Suspension',
    },
    { 
      num: '9', 
      title: 'Partner Notification', 
      desc: 'Formal email & SMS sent containing case breakdown and one-click appeal link.', 
      icon: Mail, 
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      ruleDetail: 'Partner provided 48 hours to submit proof of emergency or clinical dispute.',
      messageSample: '📧 Email: "Action Required: Submit your appeal with supporting proof via HomeDigo Partner Portal."',
      actionTag: 'Due Process',
    },
    { 
      num: '10', 
      title: 'Appeal & Evaluation', 
      desc: 'Partner submits proof (medical report, traffic challan, emergency photo).', 
      icon: FileText, 
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      ruleDetail: 'Admin operations team re-evaluates appeal within 4 business hours.',
      messageSample: '📑 Appeal #AP-108 under review by Medical Director.',
      actionTag: 'Re-Evaluation',
    },
    { 
      num: '11', 
      title: 'Account Restored', 
      desc: 'Account re-enabled immediately upon valid justification without penalty.', 
      icon: CheckCircle2, 
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      ruleDetail: 'Partner status returned to APPROVED and reinstated in nearby matching pool.',
      messageSample: '🎉 Notification: "Appeal Approved! Your account is active and ready to receive bookings."',
      actionTag: 'Restored',
    },
  ];

  const currentStep = steps[activeStepIndex];
  const CurrentIcon = currentStep.icon;

  return (
    <section id="governance" className="py-20 lg:py-28 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Platform Reliability & Patient Trust</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-heading">
            11-Step No-Show & Quality <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 bg-clip-text text-transparent">
              Governance Engine
            </span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            Interactive walkthrough of how HomeDigo ensures 99%+ punctuality while protecting clinical partners with fair appeal governance.
          </p>
        </div>

        {/* Interactive Step Explorer Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-lg mb-12">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-blue-600 text-white font-mono">
                Step {currentStep.num} of 11
              </span>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                {currentStep.title}
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {currentStep.actionTag}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left explanation */}
            <div className="lg:col-span-7 space-y-4">
              <p className="text-sm text-slate-700 font-medium leading-relaxed">
                {currentStep.desc}
              </p>

              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/80 space-y-1.5">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  Automated Enforcement Rule
                </span>
                <p className="text-xs text-slate-700 font-semibold">
                  {currentStep.ruleDetail}
                </p>
              </div>
            </div>

            {/* Right Live SMS/WhatsApp preview */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-2 border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 text-teal-400 font-bold">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Simulated Platform Message
                  </span>
                  <span>Real-time</span>
                </div>
                <p className="text-xs text-slate-200 font-mono py-1">
                  {currentStep.messageSample}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 11 Steps Interactive Scrubber Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeStepIndex === idx;
            return (
              <button
                key={step.num}
                onClick={() => setActiveStepIndex(idx)}
                className={`text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono font-black ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                    #{step.num}
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className={`text-xs font-bold leading-tight truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                  {step.title}
                </p>
              </button>
            );
          })}
        </div>

        {/* Quality Guarantee Banner */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-xl font-bold tracking-tight font-heading">Our 100% On-Time Care Guarantee</h4>
            <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
              If an assigned healthcare partner is unable to arrive, our automated dispatch immediately routes an emergency backup partner or issues a 100% instant refund.
            </p>
          </div>
          <a
            href="#services"
            className="px-6 py-3 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs sm:text-sm shadow-md transition-all whitespace-nowrap hover:scale-105 active:scale-95 font-heading"
          >
            Explore Services
          </a>
        </div>

      </div>
    </section>
  );
}
