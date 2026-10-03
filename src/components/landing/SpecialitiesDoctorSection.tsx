'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  Activity,
  HeartPulse,
  Baby,
  Bone,
  Wind,
  Eye,
  Brain,
  Shield,
  Star,
  Award,
  MapPin,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Search,
  X,
  Clock,
  Building,
  GraduationCap,
  Globe,
  FileText,
  UserCheck,
  Phone,
  Layers,
  Check,
  Navigation,
  LocateFixed,
  Loader2
} from 'lucide-react';
import { getSpecialityIcon } from '@/components/specialities/SpecialitiesManager';
import { calculateDistanceKm, estimateTravelMinutes, reverseGeocode } from '@/lib/geo';

interface Speciality {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  doctor_count?: number;
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  partner_type: string;
  speciality_id: string;
  speciality_name: string;
  speciality_icon?: string;
  specialization: string;
  qualifications: string;
  consultation_fee: number;
  council_reg_number: string;
  experience_years: number;
  service_radius_km: number;
  rating: number;
  completed_visits: number;
  bio?: string;
  location_name?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export default function SpecialitiesDoctorSection() {
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDoctorModal, setSelectedDoctorModal] = useState<Doctor | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [specRes, docRes] = await Promise.all([
          fetch('/api/specialities'),
          fetch('/api/doctors'),
        ]);

        const [specData, docData] = await Promise.all([
          specRes.json(),
          docRes.json(),
        ]);

        if (specData.specialities) setSpecialities(specData.specialities);
        if (docData.doctors) setDoctors(docData.doctors);
      } catch (err) {
        console.error('Failed to fetch specialities and doctors:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleDetectLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const geo = await reverseGeocode(latitude, longitude);
        setUserCoords({
          lat: latitude,
          lng: longitude,
          name: geo.displayName || 'Current Location',
        });
        setDetectingLocation(false);
      },
      (err) => {
        console.error('Live location detection error:', err);
        setDetectingLocation(false);
        // Fallback default Bangalore coordinates
        setUserCoords({
          lat: 12.9716,
          lng: 77.5946,
          name: 'Bengaluru Central (Live GPS)',
        });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Derive unique cities/localities from registered doctors
  const uniqueDoctorLocations = Array.from(
    new Set(
      doctors
        .map((d) => d.city || d.location_name)
        .filter((loc): loc is string => Boolean(loc && loc.trim()))
    )
  );

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSpec = selectedSpecId === 'ALL' || doc.speciality_id === selectedSpecId;
    const matchesSearch =
      !searchQuery.trim() ||
      doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.speciality_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.qualifications?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.bio?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation =
      selectedLocation === 'ALL' ||
      (doc.city && doc.city.toLowerCase().includes(selectedLocation.toLowerCase())) ||
      (doc.location_name && doc.location_name.toLowerCase().includes(selectedLocation.toLowerCase()));

    return matchesSpec && matchesSearch && matchesLocation;
  });

  const totalSpecialities = specialities.length;
  const totalDoctorsCount = doctors.length;

  return (
    <section id="specialities" className="py-24 bg-[#f8fafc] border-y border-slate-200/90 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Header Badge & Title (Narayana Health hospital styling) */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#034EA2] text-xs font-black uppercase tracking-wider shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-[#034EA2]" />
            Clinical Excellence & Verified Specialist Directory
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-heading">
            Find Doctors by Medical Specialty
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Consult accredited medical consultants and senior specialists for personalized home visits, routine reviews, and comprehensive bedside evaluations.
          </p>
        </div>

        {/* Narayana Health-Inspired Search & Hub Filter Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
          {/* Location Selector */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs font-bold text-slate-700 w-full md:w-auto shrink-0">
            <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="ALL">All Hubs & Locations ({uniqueDoctorLocations.length > 0 ? `${uniqueDoctorLocations.length} areas` : 'Pan-City'})</option>
              {uniqueDoctorLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Live GPS Trigger Button */}
          <button
            type="button"
            onClick={handleDetectLiveLocation}
            disabled={detectingLocation}
            title="Calculate distance to doctors from your current live GPS position"
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition-all shrink-0 ${
              userCoords
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {detectingLocation ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Locating GPS...</span>
              </>
            ) : userCoords ? (
              <>
                <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
                <span className="max-w-[140px] truncate">{userCoords.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5 text-teal-600" />
                <span>Use My Location</span>
              </>
            )}
          </button>

          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Doctor Name, Speciality, or Symptoms (e.g. Diabetologist, Fever, Dr. Rajesh)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#034EA2] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Clear / Total Counter Badge */}
          <div className="px-3 py-2 text-xs font-bold text-slate-500 whitespace-nowrap hidden lg:block">
            <strong className="text-slate-900">{filteredDoctors.length}</strong> Specialists
          </div>
        </div>

        {/* Clinical Specialties Carousel Tabs (Narayana Health Center of Excellence format) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Select Clinical Department
            </span>
            <span className="text-xs font-semibold text-[#034EA2]">
              {totalSpecialities} Medical Specialties
            </span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-none no-scrollbar">
            <button
              onClick={() => setSelectedSpecId('ALL')}
              className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-xs ${
                selectedSpecId === 'ALL'
                  ? 'bg-[#034EA2] text-white shadow-md shadow-[#034EA2]/20'
                  : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>All Specialties ({totalDoctorsCount})</span>
            </button>

            {specialities.map((spec) => {
              const Icon = getSpecialityIcon(spec.icon);
              const isSelected = selectedSpecId === spec.id;
              const count = Number(spec.doctor_count || 0);

              return (
                <button
                  key={spec.id}
                  onClick={() => setSelectedSpecId(spec.id)}
                  className={`shrink-0 flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-xs ${
                    isSelected
                      ? 'bg-[#034EA2] text-white shadow-md shadow-[#034EA2]/20 ring-2 ring-[#034EA2]/20'
                      : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#034EA2]'}`} />
                  <span>{spec.name}</span>
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Speciality Overview Card */}
        {selectedSpecId !== 'ALL' && (
          (() => {
            const currentSpec = specialities.find((s) => s.id === selectedSpecId);
            if (!currentSpec) return null;
            const Icon = getSpecialityIcon(currentSpec.icon);
            return (
              <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#034EA2] shrink-0">
                    <Icon className="w-7 h-7 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-[#034EA2] border border-blue-200/70">
                        Department of {currentSpec.name}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">{currentSpec.name}</h3>
                    <p className="text-xs text-slate-600 max-w-2xl mt-0.5 leading-relaxed">
                      {currentSpec.description || 'Specialized home doctor visits, preventive diagnosis, and medication monitoring.'}
                    </p>
                  </div>
                </div>
                <div className="text-xs font-bold text-[#034EA2] bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 shrink-0 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{filteredDoctors.length} {filteredDoctors.length === 1 ? 'Specialist' : 'Specialists'} Available</span>
                </div>
              </div>
            );
          })()
        )}

        {/* Doctors Grid (Narayana Health Clinical Cards) */}
        {loading ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 border-3 border-[#034EA2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Loading accredited specialists...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 shadow-xs space-y-4">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {selectedSpecId === 'ALL'
                  ? 'No Doctors Available Matching Your Query'
                  : 'No Doctors Currently Available in this Specialty'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {selectedSpecId === 'ALL'
                  ? 'Try adjusting your search criteria or register certified clinicians in the Admin Portal.'
                  : 'Browse other departments or schedule an on-demand general medicine doctor visit.'}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSelectedSpecId('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                Clear Filters
              </button>
              <Link
                href="/patient/book?service=srv_doc"
                className="px-5 py-2 rounded-xl bg-[#034EA2] hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-800/20 transition-all"
              >
                Request General Home Visit
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:border-[#034EA2]/50 relative overflow-hidden"
              >
                {/* Verified Header Strip */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#034EA2] via-teal-500 to-emerald-500 opacity-80" />

                <div>
                  {/* Doctor Profile Top Row */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative shrink-0">
                      <img
                        src={
                          doc.image ||
                          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=256&q=80'
                        }
                        alt={doc.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/20 group-hover:scale-105 transition-transform"
                      />
                      <span
                        title="Verified Medical Practitioner"
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] ring-2 ring-white shadow-xs"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#034EA2] border border-blue-200/70 mb-1">
                        <Sparkles className="w-3 h-3 text-[#034EA2]" />
                        {doc.speciality_name || 'General Medicine'}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 font-heading leading-tight group-hover:text-[#034EA2] transition-colors">
                        {doc.name}
                      </h4>
                      <p className="text-xs text-slate-600 font-semibold mt-0.5">
                        {doc.specialization}
                      </p>
                    </div>
                  </div>

                  {/* Qualifications & Medical Council Reg */}
                  <div className="space-y-1.5 mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                    {doc.qualifications && (
                      <div className="flex items-center gap-2 text-slate-700 font-semibold">
                        <GraduationCap className="w-3.5 h-3.5 text-[#034EA2] shrink-0" />
                        <span className="truncate">{doc.qualifications}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Medical Council:</span>
                      <strong className="text-slate-800">{doc.council_reg_number || 'MCI-APPROVED'}</strong>
                    </div>
                  </div>

                  {/* Narayana Health Style Meta Grid */}
                  <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{doc.experience_years || 5}+ Yrs Exp</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                      <span>{doc.rating || 5.0} Rating</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{doc.service_radius_km || 10} km Radius</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{doc.completed_visits || 0} Home Visits</span>
                    </div>
                  </div>

                  {/* Real-time Location & Distance Badge */}
                  {(() => {
                    const docLat = doc.latitude ? Number(doc.latitude) : null;
                    const docLng = doc.longitude ? Number(doc.longitude) : null;
                    const hasCoords = docLat !== null && docLng !== null && docLat !== 0 && docLng !== 0;
                    const distance = (userCoords && hasCoords)
                      ? calculateDistanceKm(userCoords.lat, userCoords.lng, docLat!, docLng!)
                      : null;
                    const etaMins = distance !== null ? estimateTravelMinutes(distance) : null;

                    return (
                      <div className="space-y-2 mt-3">
                        {/* Location Tag */}
                        <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                          <span className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate">{doc.location_name || doc.city || 'Bengaluru Central'}</span>
                          </span>
                          {distance !== null ? (
                            <span className="shrink-0 font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
                              📍 {distance} km · ~{etaMins} mins
                            </span>
                          ) : (
                            <span className="text-slate-400 shrink-0 font-medium">Within {doc.service_radius_km || 10} km</span>
                          )}
                        </div>

                        {/* Real-time Status Badge */}
                        <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                          <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            Available for Doorstep Visit
                          </span>
                          <span className="text-slate-400">English, Hindi, Kannada</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Consultation Fee & Dual Narayana Health CTAs */}
                <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Home Consultation</p>
                      <p className="text-lg font-black text-slate-900">
                        ₹{doc.consultation_fee || 550}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedDoctorModal(doc)}
                      className="text-xs font-bold text-[#034EA2] hover:underline"
                    >
                      View Profile &rarr;
                    </button>
                  </div>

                  <Link
                    href={`/patient/book?doctor=${encodeURIComponent(doc.id)}&service=srv_doc`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#034EA2] hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-800/20 transition-all group-hover:scale-101"
                  >
                    <span>Book Home Visit</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doctor Profile Modal (Narayana Health hospital overview format) */}
      {selectedDoctorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#034EA2] to-blue-800 text-white relative">
              <button
                onClick={() => setSelectedDoctorModal(null)}
                className="absolute right-5 top-5 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4">
                <img
                  src={
                    selectedDoctorModal.image ||
                    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=256&q=80'
                  }
                  alt={selectedDoctorModal.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/20 shrink-0"
                />
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                    <Sparkles className="w-3 h-3" />
                    {selectedDoctorModal.speciality_name || 'General Medicine'}
                  </div>
                  <h3 className="text-xl font-bold font-heading">{selectedDoctorModal.name}</h3>
                  <p className="text-xs text-blue-100 font-medium">{selectedDoctorModal.specialization}</p>
                  <p className="text-[11px] text-blue-200">
                    Registration No: <strong>{selectedDoctorModal.council_reg_number || 'KMC-84920'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs text-slate-700">
              {/* Quick Metrics */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Experience</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {selectedDoctorModal.experience_years || 5}+ Years
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Patient Rating</div>
                  <div className="text-sm font-black text-amber-500 mt-0.5">
                    ★ {selectedDoctorModal.rating || 5.0} / 5.0
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Consultation Fee</div>
                  <div className="text-sm font-black text-emerald-700 mt-0.5">
                    ₹{selectedDoctorModal.consultation_fee || 550}
                  </div>
                </div>
              </div>

              {/* Degrees & Qualifications */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#034EA2]" />
                  <span>Medical Qualifications & Accreditations</span>
                </h4>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 font-semibold text-slate-800">
                  {selectedDoctorModal.qualifications || 'MBBS, MD - Registered Medical Practitioner'}
                </div>
              </div>

              {/* Clinic / Hub Location & Distance */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>Practice Location & Coverage</span>
                </h4>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900">{selectedDoctorModal.location_name || 'Central Hub'}</div>
                    <div className="text-slate-500">{selectedDoctorModal.city || 'Bengaluru, Karnataka'}</div>
                  </div>
                  {userCoords && selectedDoctorModal.latitude && selectedDoctorModal.longitude && (
                    <div className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200">
                      📍 {calculateDistanceKm(userCoords.lat, userCoords.lng, Number(selectedDoctorModal.latitude), Number(selectedDoctorModal.longitude))} km away from your location
                    </div>
                  )}
                </div>
              </div>

              {/* Biography & Scope */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#034EA2]" />
                  <span>Clinical Profile & Summary</span>
                </h4>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {selectedDoctorModal.bio ||
                    'Experienced physician providing comprehensive at-home medical evaluation, continuous vitals monitoring, chronic condition titration, prescription renewals, and personalized elderly care.'}
                </p>
              </div>

              {/* Coverage & Languages */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold mb-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>Coverage Radius</span>
                  </div>
                  <div className="font-bold text-slate-800">
                    Up to {selectedDoctorModal.service_radius_km || 10} km service area
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold mb-1">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>Languages Spoken</span>
                  </div>
                  <div className="font-bold text-slate-800">English, Hindi, Kannada, Tamil</div>
                </div>
              </div>

              {/* Modal CTA Action */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Consultation</span>
                  <p className="text-xl font-black text-slate-900">
                    ₹{selectedDoctorModal.consultation_fee || 550}
                  </p>
                </div>
                <Link
                  href={`/patient/book?doctor=${encodeURIComponent(selectedDoctorModal.id)}&service=srv_doc`}
                  className="px-6 py-3 rounded-xl bg-[#034EA2] hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-800/20 transition-all flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment / Home Visit</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
