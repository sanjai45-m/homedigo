'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  Plus,
  ShieldCheck,
  Star,
  MapPin,
  Award,
  Phone,
  Mail,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  Stethoscope,
  Sparkles,
  DollarSign,
  HeartHandshake,
  Activity,
  Filter,
  Layers,
  GraduationCap,
  Loader2
} from 'lucide-react';
import LocationPicker from '@/components/shared/LocationPicker';

interface Speciality {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
}

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  partner_type: 'DOCTOR' | 'NURSE' | 'PHYSIOTHERAPIST' | 'CAREGIVER';
  speciality_id?: string;
  speciality_name?: string;
  speciality_icon?: string;
  specialization: string;
  qualifications?: string;
  consultation_fee?: number;
  council_reg_number: string;
  experience_years: number;
  service_radius_km: number;
  location_name?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  verification_status: 'APPROVED' | 'PENDING' | 'UNDER_REVIEW' | 'REJECTED';
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  rating: number;
  completed_visits: number;
  bio?: string;
}

interface Props {
  portalRole: 'ADMIN' | 'SUPER_ADMIN';
}

const PARTNER_TYPES = [
  { value: 'DOCTOR', label: 'Doctor / Physician', icon: Stethoscope, color: 'teal' },
  { value: 'NURSE', label: 'Registered Nurse', icon: HeartHandshake, color: 'blue' },
  { value: 'PHYSIOTHERAPIST', label: 'Physiotherapist', icon: Activity, color: 'indigo' },
  { value: 'CAREGIVER', label: 'Caregiver / Attendant', icon: Sparkles, color: 'amber' },
];

export default function PartnersManager({ portalRole }: Props) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedSpecialityFilter, setSelectedSpecialityFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // New Partner form state
  const [newPartner, setNewPartner] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'Partner@123',
    partnerType: 'DOCTOR' as 'DOCTOR' | 'NURSE' | 'PHYSIOTHERAPIST' | 'CAREGIVER',
    specialityId: '',
    specialization: 'General Physician & Home Care',
    qualifications: 'MBBS, MD',
    consultationFee: 550,
    councilRegNumber: '',
    experienceYears: 6,
    serviceRadiusKm: 12,
    locationName: 'Bengaluru Central, Karnataka',
    city: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    verificationStatus: 'APPROVED' as const,
    availability: 'AVAILABLE' as const,
    bio: '',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80',
  });

  // Edit Partner form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    partnerType: 'DOCTOR' as 'DOCTOR' | 'NURSE' | 'PHYSIOTHERAPIST' | 'CAREGIVER',
    specialityId: '',
    specialization: '',
    qualifications: '',
    consultationFee: 550,
    councilRegNumber: '',
    experienceYears: 5,
    serviceRadiusKm: 10,
    locationName: 'Bengaluru Central, Karnataka',
    city: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    verificationStatus: 'APPROVED' as const,
    availability: 'AVAILABLE' as const,
    bio: '',
    image: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [partnersRes, specRes] = await Promise.all([
        fetch('/api/admin/partners'),
        fetch('/api/specialities'),
      ]);
      const [partnersData, specData] = await Promise.all([
        partnersRes.json(),
        specRes.json(),
      ]);

      if (partnersData.partners) setPartners(partnersData.partners);
      if (specData.specialities) {
        setSpecialities(specData.specialities);
        if (specData.specialities.length > 0 && !newPartner.specialityId) {
          setNewPartner((prev) => ({ ...prev, specialityId: specData.specialities[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to load partners or specialities' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditModal = (partner: Partner) => {
    setEditingPartner(partner);
    setEditForm({
      name: partner.name || '',
      email: partner.email || '',
      phone: partner.phone || '',
      partnerType: partner.partner_type || 'DOCTOR',
      specialityId: partner.speciality_id || (specialities[0]?.id || ''),
      specialization: partner.specialization || '',
      qualifications: partner.qualifications || '',
      consultationFee: partner.consultation_fee ? Number(partner.consultation_fee) : 550,
      councilRegNumber: partner.council_reg_number || '',
      experienceYears: partner.experience_years ? Number(partner.experience_years) : 5,
      serviceRadiusKm: partner.service_radius_km ? Number(partner.service_radius_km) : 10,
      locationName: partner.location_name || 'Bengaluru Central, Karnataka',
      city: partner.city || 'Bengaluru',
      latitude: partner.latitude ? Number(partner.latitude) : 12.9716,
      longitude: partner.longitude ? Number(partner.longitude) : 77.5946,
      verificationStatus: (partner.verification_status || 'APPROVED') as any,
      availability: (partner.availability || 'AVAILABLE') as any,
      bio: partner.bio || '',
      image: partner.image || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingPartner.id,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          image: editForm.image,
          partnerType: editForm.partnerType,
          specialityId: editForm.partnerType === 'DOCTOR' ? editForm.specialityId : null,
          specialization: editForm.specialization,
          qualifications: editForm.qualifications,
          consultationFee: editForm.consultationFee,
          councilRegNumber: editForm.councilRegNumber,
          experienceYears: editForm.experienceYears,
          serviceRadiusKm: editForm.serviceRadiusKm,
          locationName: editForm.locationName,
          city: editForm.city,
          latitude: editForm.latitude,
          longitude: editForm.longitude,
          verificationStatus: editForm.verificationStatus,
          availability: editForm.availability,
          bio: editForm.bio,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Updated profile details for "${editForm.name}" successfully!`,
        });
        setIsEditModalOpen(false);
        setEditingPartner(null);
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to update partner' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error updating partner profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, verificationStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Partner status updated to ${newStatus}` });
        fetchData();
      }
    } catch (e) {
      setFeedback({ type: 'error', message: 'Failed to update status' });
    }
  };

  const handleDeletePartner = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the platform?`)) return;
    try {
      const res = await fetch(`/api/admin/partners?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Removed "${name}" from platform.` });
        fetchData();
      }
    } catch (e) {
      setFeedback({ type: 'error', message: 'Failed to remove partner' });
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPartner),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Onboarded and verified ${newPartner.partnerType.toLowerCase()} "${newPartner.name}"!`,
        });
        setIsNewModalOpen(false);
        setNewPartner({
          name: '',
          email: '',
          phone: '',
          password: 'Partner@123',
          partnerType: 'DOCTOR',
          specialityId: specialities[0]?.id || '',
          specialization: 'General Physician & Home Care',
          qualifications: 'MBBS, MD',
          consultationFee: 550,
          councilRegNumber: '',
          experienceYears: 6,
          serviceRadiusKm: 12,
          locationName: 'Bengaluru Central, Karnataka',
          city: 'Bengaluru',
          latitude: 12.9716,
          longitude: 77.5946,
          verificationStatus: 'APPROVED',
          availability: 'AVAILABLE',
          bio: '',
          image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80',
        });
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to create partner' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error onboarding partner' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPartners = partners.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.qualifications?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.council_reg_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedTypeFilter === 'ALL' || (p.partner_type || 'DOCTOR') === selectedTypeFilter;

    const matchesSpec =
      selectedSpecialityFilter === 'ALL' || p.speciality_id === selectedSpecialityFilter;

    return matchesSearch && matchesType && matchesSpec;
  });

  const isSuperAdmin = portalRole === 'SUPER_ADMIN';
  const primaryThemeColor = isSuperAdmin
    ? 'from-purple-600 to-indigo-600'
    : 'from-teal-600 to-emerald-600';
  const buttonBadgeColor = isSuperAdmin
    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
    : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-0.5 rounded-full border ${
                isSuperAdmin
                  ? 'text-purple-800 bg-purple-50 border-purple-200'
                  : 'text-teal-800 bg-teal-50 border-teal-200'
              }`}
            >
              {isSuperAdmin ? 'Platform Governance' : 'Admin Clinician Desk'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mt-1">
            Doctor & Healthcare Partner Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage live GPS locations, specialities, consultation fees, and KYC credentials for all doctors and nurses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={isSuperAdmin ? '/super-admin/specialities' : '/admin/specialities'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Manage Specialities (CRUD)</span>
          </Link>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${primaryThemeColor} text-white font-bold text-xs shadow-md ${buttonBadgeColor} transition-all hover:scale-102 active:scale-98`}
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New Doctor / Partner</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Type Filter Pills & Speciality Filter */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedTypeFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedTypeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Partners ({partners.length})
          </button>
          {PARTNER_TYPES.map((type) => {
            const Icon = type.icon;
            const count = partners.filter((p) => (p.partner_type || 'DOCTOR') === type.value).length;
            const isSelected = selectedTypeFilter === type.value;
            return (
              <button
                key={type.value}
                onClick={() => setSelectedTypeFilter(type.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>
                  {type.label} ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Speciality Dropdown Filter */}
        <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, locality/city, qualifications, or council reg no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-teal-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedSpecialityFilter}
              onChange={(e) => setSelectedSpecialityFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold focus:outline-none focus:border-teal-600"
            >
              <option value="ALL">All Doctor Specialities</option>
              {specialities.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-semibold whitespace-nowrap">
            Showing <strong className="text-slate-900">{filteredPartners.length}</strong> Registered Partners
          </div>
        </div>
      </div>

      {/* Partners List / Loading / Empty */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                  <div className="space-y-2">
                    <div className="w-20 h-4 bg-slate-200 rounded-md" />
                    <div className="w-32 h-4 bg-slate-200 rounded-md" />
                    <div className="w-24 h-3 bg-slate-100 rounded-md" />
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-100" />
              </div>
              <div className="h-10 rounded-2xl bg-slate-50" />
              <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100">
                <div className="h-4 bg-slate-100 rounded-md" />
                <div className="h-4 bg-slate-100 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 shadow-xs">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Partners / Doctors Match</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try resetting your filters or click "Onboard New Doctor / Partner" above to register healthcare professionals with live GPS.
          </p>
          <button
            onClick={() => {
              setSelectedTypeFilter('ALL');
              setSelectedSpecialityFilter('ALL');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        /* Partners Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((partner) => {
            const partnerType = partner.partner_type || 'DOCTOR';
            const typeConfig = PARTNER_TYPES.find((t) => t.value === partnerType) || PARTNER_TYPES[0];

            return (
              <div
                key={partner.id}
                className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Row: Type Pill + Avatar + Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          partner.image ||
                          'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&q=80'
                        }
                        alt={partner.name}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-teal-500/20 shadow-2xs"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                            {typeConfig.label}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">{partner.name}</h3>
                        <p className="text-xs text-teal-700 font-bold">{partner.specialization}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(partner)}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-teal-700 transition-colors"
                        title="Edit Doctor / Partner Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePartner(partner.id, partner.name)}
                        className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remove Partner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Speciality and Qualifications */}
                  <div className="space-y-1.5 py-2">
                    {partner.speciality_name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Speciality: <strong>{partner.speciality_name}</strong></span>
                      </div>
                    )}
                    {partner.qualifications && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        <span>{partner.qualifications}</span>
                      </div>
                    )}
                    {partner.consultation_fee && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Home Consultation Fee: ₹{partner.consultation_fee}</span>
                      </div>
                    )}
                  </div>

                  {/* Registered Practice Location with GPS Coordinates */}
                  <div className="p-2.5 rounded-2xl bg-teal-50/50 border border-teal-100 text-xs flex items-start gap-2 text-teal-900">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">{partner.location_name || 'Bengaluru Central'}</div>
                      <div className="text-[10px] text-teal-700">
                        {partner.city || 'Bengaluru'} · {partner.service_radius_km || 10} km doorstep coverage
                      </div>
                    </div>
                  </div>

                  {/* Badges & Meta Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 py-3 border-y border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{partner.experience_years || 5}+ yrs exp</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      <span>{partner.rating || 5.0} Rating</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{partner.service_radius_km || 10} km radius</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{partner.completed_visits || 0} visits</span>
                    </div>
                  </div>

                  {/* Registration Number, Email & Phone */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Council / Reg ID</div>
                        <div className="text-xs font-mono font-bold text-slate-800">
                          {partner.council_reg_number || 'REG-VERIFIED'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Phone</div>
                        <div className="text-xs font-semibold text-slate-700">{partner.phone || 'N/A'}</div>
                      </div>
                    </div>
                    {partner.email && (
                      <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span className="font-bold text-slate-400 uppercase text-[9px]">Email:</span>
                        <span className="text-slate-700 font-semibold truncate max-w-[200px]">{partner.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* KYC Approval Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      partner.verification_status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {partner.verification_status}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(partner)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold"
                    >
                      Edit
                    </button>
                    {partner.verification_status !== 'APPROVED' && (
                      <button
                        onClick={() => handleStatusChange(partner.id, 'APPROVED')}
                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-2xs"
                      >
                        Approve KYC
                      </button>
                    )}
                    {partner.verification_status !== 'REJECTED' && (
                      <button
                        onClick={() => handleStatusChange(partner.id, 'REJECTED')}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Doctor / Partner Modal */}
      {isEditModalOpen && editingPartner && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdatePartner}
            className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-teal-600" />
                <span>Edit Healthcare Practitioner Profile</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Role / Partner Type */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Healthcare Role / Partner Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PARTNER_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = editForm.partnerType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, partnerType: type.value as any })}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left font-bold transition-all ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
                        <span className="text-xs">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Speciality Dropdown (for Doctors) */}
              {editForm.partnerType === 'DOCTOR' && (
                <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-teal-900 font-bold">
                      Medical Speciality
                    </label>
                    <Link
                      href={isSuperAdmin ? '/super-admin/specialities' : '/admin/specialities'}
                      target="_blank"
                      className="text-[11px] text-teal-700 hover:underline font-bold"
                    >
                      + Add / Edit Specialities
                    </Link>
                  </div>
                  <select
                    value={editForm.specialityId}
                    onChange={(e) => setEditForm({ ...editForm, specialityId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-teal-200 text-slate-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Choose Medical Speciality --</option>
                    {specialities.map((spec) => (
                      <option key={spec.id} value={spec.id}>
                        {spec.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Live Location / GPS Autocomplete */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <LocationPicker
                  initialLocationName={editForm.locationName}
                  initialCity={editForm.city}
                  initialLat={editForm.latitude}
                  initialLng={editForm.longitude}
                  onLocationSelect={(loc) => {
                    setEditForm({
                      ...editForm,
                      locationName: loc.locationName,
                      city: loc.city,
                      latitude: loc.lat,
                      longitude: loc.lng,
                    });
                  }}
                  label="Practitioner Base Location & Live GPS"
                  placeholder="Search clinic locality e.g. Indiranagar, Koramangala or detect live GPS..."
                />
              </div>

              {/* Full Name, Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Direct Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>
              </div>

              {/* Designation & Qualifications */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Clinical Designation *</label>
                  <input
                    type="text"
                    required
                    value={editForm.specialization}
                    onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Degrees / Qualifications</label>
                  <input
                    type="text"
                    value={editForm.qualifications}
                    onChange={(e) => setEditForm({ ...editForm, qualifications: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>
              </div>

              {/* Fee & Council Reg */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Home Consultation Fee (₹)</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={editForm.consultationFee}
                    onChange={(e) => setEditForm({ ...editForm, consultationFee: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Medical Council / Reg No.</label>
                  <input
                    type="text"
                    value={editForm.councilRegNumber}
                    onChange={(e) => setEditForm({ ...editForm, councilRegNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-mono"
                  />
                </div>
              </div>

              {/* Experience & Radius */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.experienceYears}
                    onChange={(e) => setEditForm({ ...editForm, experienceYears: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Service Radius (Km)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editForm.serviceRadiusKm}
                    onChange={(e) => setEditForm({ ...editForm, serviceRadiusKm: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Status & Availability */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">KYC Verification Status</label>
                  <select
                    value={editForm.verificationStatus}
                    onChange={(e) => setEditForm({ ...editForm, verificationStatus: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs focus:outline-none focus:border-teal-600"
                  >
                    <option value="APPROVED">APPROVED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="UNDER_REVIEW">UNDER REVIEW</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Availability</label>
                  <select
                    value={editForm.availability}
                    onChange={(e) => setEditForm({ ...editForm, availability: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs focus:outline-none focus:border-teal-600"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="BUSY">BUSY</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </div>
              </div>

              {/* Avatar Image URL */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Profile Photo URL</label>
                <input
                  type="text"
                  value={editForm.image}
                  onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 text-xs font-medium"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Practitioner Bio / Summary</label>
                <textarea
                  rows={2}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all disabled:opacity-75 ${buttonBadgeColor}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Onboard New Partner Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePartner}
            className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" />
                <span>Onboard Healthcare Professional</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Step 1: Select Partner Type */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  1. Select Healthcare Role / Partner Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PARTNER_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = newPartner.partnerType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setNewPartner({
                            ...newPartner,
                            partnerType: type.value as any,
                            specialization:
                              type.value === 'DOCTOR'
                                ? 'General Physician & Home Care'
                                : type.value === 'NURSE'
                                ? 'Registered ICU / Clinical Nurse'
                                : type.value === 'PHYSIOTHERAPIST'
                                ? 'Orthopedic & Neuro Physiotherapist'
                                : 'Elderly Care & Patient Assistant',
                          })
                        }
                        className={`flex items-center gap-2 p-3 rounded-2xl border text-left font-bold transition-all ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs">{type.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2 (If Doctor): Medical Speciality Dropdown */}
              {newPartner.partnerType === 'DOCTOR' && (
                <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-teal-900 font-bold">
                      Doctor Clinical Speciality <span className="text-rose-500">*</span>
                    </label>
                    <Link
                      href={isSuperAdmin ? '/super-admin/specialities' : '/admin/specialities'}
                      target="_blank"
                      className="text-[11px] text-teal-700 hover:underline font-bold"
                    >
                      + Manage Specialities
                    </Link>
                  </div>
                  <select
                    value={newPartner.specialityId}
                    onChange={(e) => setNewPartner({ ...newPartner, specialityId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-teal-200 text-slate-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Choose Medical Speciality --</option>
                    {specialities.map((spec) => (
                      <option key={spec.id} value={spec.id}>
                        {spec.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 3: Base Location with GPS and Autocomplete */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <LocationPicker
                  initialLocationName={newPartner.locationName}
                  initialCity={newPartner.city}
                  initialLat={newPartner.latitude}
                  initialLng={newPartner.longitude}
                  onLocationSelect={(loc) => {
                    setNewPartner({
                      ...newPartner,
                      locationName: loc.locationName,
                      city: loc.city,
                      latitude: loc.lat,
                      longitude: loc.lng,
                    });
                  }}
                  label="Practitioner Base Location & Live GPS"
                  placeholder="Search clinic locality e.g. Indiranagar, Koramangala or detect live GPS..."
                />
              </div>

              {/* Full Name, Email, Password, Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {newPartner.partnerType === 'DOCTOR' ? 'Doctor Full Name *' : 'Partner Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={newPartner.partnerType === 'DOCTOR' ? 'Dr. Ananya Mukherjee' : 'Priya Sharma'}
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Registration Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="practitioner@homedigo.care"
                    value={newPartner.email}
                    onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Account Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="Partner@123"
                    value={newPartner.password}
                    onChange={(e) => setNewPartner({ ...newPartner, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-mono text-xs font-bold text-teal-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Direct Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>
              </div>

              {/* Specialization & Qualifications */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Clinical Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Consultant Diabetologist"
                    value={newPartner.specialization}
                    onChange={(e) => setNewPartner({ ...newPartner, specialization: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Medical Degrees / Qualifications</label>
                  <input
                    type="text"
                    placeholder="e.g., MBBS, MD (General Medicine)"
                    value={newPartner.qualifications}
                    onChange={(e) => setNewPartner({ ...newPartner, qualifications: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>
              </div>

              {/* Consultation Fee & Council Reg Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Home Visit Consultation Fee (₹)</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={newPartner.consultationFee}
                    onChange={(e) => setNewPartner({ ...newPartner, consultationFee: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Medical Council / Reg No.</label>
                  <input
                    type="text"
                    placeholder="KMC-84920-IND"
                    value={newPartner.councilRegNumber}
                    onChange={(e) => setNewPartner({ ...newPartner, councilRegNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-mono"
                  />
                </div>
              </div>

              {/* Phone & Experience */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98450 12345"
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min="1"
                    value={newPartner.experienceYears}
                    onChange={(e) => setNewPartner({ ...newPartner, experienceYears: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Bio / Summary */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Practitioner Bio / Summary</label>
                <textarea
                  rows={2}
                  placeholder="Senior clinician with extensive hospital and home health experience..."
                  value={newPartner.bio}
                  onChange={(e) => setNewPartner({ ...newPartner, bio: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all disabled:opacity-75 ${buttonBadgeColor}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Onboarding Practitioner...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save & Verify Partner</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
