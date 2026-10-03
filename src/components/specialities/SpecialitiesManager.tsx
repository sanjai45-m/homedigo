'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Edit2,
  Trash2,
  Stethoscope,
  Activity,
  HeartPulse,
  Baby,
  Bone,
  Wind,
  Eye,
  Brain,
  Shield,
  CheckCircle2,
  AlertCircle,
  Users,
  RefreshCw,
  X,
  Layers,
  Loader2,
} from 'lucide-react';

const ICON_OPTIONS = [
  { label: 'Stethoscope (General / Internal)', value: 'Stethoscope', icon: Stethoscope },
  { label: 'Activity (Diabetology / Vitals)', value: 'Activity', icon: Activity },
  { label: 'HeartPulse (Cardiology / Geriatrics)', value: 'HeartPulse', icon: HeartPulse },
  { label: 'Baby (Pediatrics)', value: 'Baby', icon: Baby },
  { label: 'Bone (Orthopedics)', value: 'Bone', icon: Bone },
  { label: 'Wind (Pulmonology / Respiratory)', value: 'Wind', icon: Wind },
  { label: 'Eye (Ophthalmology)', value: 'Eye', icon: Eye },
  { label: 'Brain (Neurology / Psychiatry)', value: 'Brain', icon: Brain },
  { label: 'Shield (Preventive Care)', value: 'Shield', icon: Shield },
];

export function getSpecialityIcon(iconName?: string) {
  switch (iconName) {
    case 'Activity':
      return Activity;
    case 'HeartPulse':
      return HeartPulse;
    case 'Baby':
      return Baby;
    case 'Bone':
      return Bone;
    case 'Wind':
      return Wind;
    case 'Eye':
      return Eye;
    case 'Brain':
      return Brain;
    case 'Shield':
      return Shield;
    case 'Stethoscope':
    default:
      return Stethoscope;
  }
}

interface Speciality {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  doctor_count: number;
  created_at?: string;
}

interface Props {
  portalRole: 'ADMIN' | 'SUPER_ADMIN';
}

export default function SpecialitiesManager({ portalRole }: Props) {
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Speciality | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('Stethoscope');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSpecialities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/specialities');
      const data = await res.json();
      if (data.specialities) {
        setSpecialities(data.specialities);
      }
    } catch (err) {
      console.error('Failed to load specialities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecialities();
  }, []);

  const openCreateModal = () => {
    setEditingSpec(null);
    setFormName('');
    setFormDescription('');
    setFormIcon('Stethoscope');
    setMessage(null);
    setModalOpen(true);
  };

  const openEditModal = (spec: Speciality) => {
    setEditingSpec(spec);
    setFormName(spec.name);
    setFormDescription(spec.description || '');
    setFormIcon(spec.icon || 'Stethoscope');
    setMessage(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      if (editingSpec) {
        // Update
        const res = await fetch('/api/specialities', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingSpec.id,
            name: formName.trim(),
            description: formDescription.trim(),
            icon: formIcon,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setMessage({ type: 'success', text: 'Speciality updated successfully!' });
          fetchSpecialities();
          setTimeout(() => setModalOpen(false), 800);
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to update speciality' });
        }
      } else {
        // Create
        const res = await fetch('/api/specialities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim(),
            icon: formIcon,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setMessage({ type: 'success', text: 'Speciality added successfully!' });
          fetchSpecialities();
          setTimeout(() => setModalOpen(false), 800);
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to create speciality' });
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete medical speciality "${name}"? Doctors assigned will have their speciality unlinked.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/specialities?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchSpecialities();
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredSpecialities = specialities.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  );

  const totalDoctors = specialities.reduce((acc, curr) => acc + Number(curr.doctor_count || 0), 0);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Medical Taxonomy & Clinical Specialities
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Doctor Speciality Management (CRUD)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure medical specialities. Doctors will be categorized under these specialities on the landing page and booking portals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSpecialities}
            className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all hover:scale-102 active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Add New Speciality
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Specialities</p>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{specialities.length}</p>
          <p className="text-xs text-slate-500 mt-1">Active clinical departments</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrolled Doctors</p>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalDoctors}</p>
          <p className="text-xs text-slate-500 mt-1">Mapped to specialities</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Landing Page Sync</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-emerald-700 mt-3 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            Live Real-Time
          </p>
          <p className="text-xs text-slate-500 mt-1">Instant patient filtering</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Search specialities by name, keyword, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Specialities Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-2/3 bg-slate-100 rounded" />
              </div>
              <div className="h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredSpecialities.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Specialities Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search ? 'Try adjusting your search criteria.' : 'Get started by creating your first clinical speciality.'}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Speciality
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSpecialities.map((spec) => {
            const IconComponent = getSpecialityIcon(spec.icon);
            return (
              <div
                key={spec.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100/80 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                      <IconComponent className="w-6 h-6 stroke-[2]" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(spec)}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        title="Edit Speciality"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(spec.id, spec.name)}
                        className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Speciality"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{spec.name}</h3>
                  <div className="flex items-center gap-2 my-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 uppercase tracking-wider">
                      slug: {spec.slug}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                    {spec.description || 'No detailed clinical description provided.'}
                  </p>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    <span>{spec.doctor_count || 0} Doctors Mapped</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Icon: {spec.icon || 'Stethoscope'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingSpec ? 'Edit Medical Speciality' : 'Create New Medical Speciality'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingSpec ? `Modifying taxonomy ID: ${editingSpec.id}` : 'Define a new clinical domain for doctors'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {message && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Speciality Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., General Medicine, Diabetology, Cardiology"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Icon Symbol</label>
                <div className="grid grid-cols-3 gap-2">
                  {ICON_OPTIONS.map((opt) => {
                    const IconComp = opt.icon;
                    const isSelected = formIcon === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormIcon(opt.value)}
                        className={`flex items-center gap-2 p-2 rounded-xl text-left border text-xs font-bold transition-all ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-xs'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <IconComp className={`w-4 h-4 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
                        <span className="truncate text-[11px]">{opt.value}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Clinical Scope & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe conditions treated, common procedures, and patient eligibility..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Saving...' : editingSpec ? 'Update Speciality' : 'Create Speciality'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
