'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  Stethoscope,
  Clock,
  Loader2
} from 'lucide-react';

interface ServiceItem {
  id: string;
  title: string;
  category: string;
  description: string;
  base_price: number;
  visiting_fee: number;
  commission_percentage: number;
  duration_minutes: number;
  icon: string;
  is_active: boolean;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit modal state
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // New service form state
  const [newForm, setNewForm] = useState({
    title: '',
    category: 'CONSULTATION',
    description: '',
    basePrice: 500,
    visitingFee: 50,
    commissionPercentage: 15,
    durationMinutes: 45,
    icon: 'Stethoscope',
  });

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/services');
      const data = await res.json();
      if (data.services) setServices(data.services);
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to load services' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSaveEdit = async () => {
    if (!editingService) return;
    try {
      setSaving(true);
      const res = await fetch('/api/admin/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingService.id,
          title: editingService.title,
          category: editingService.category,
          description: editingService.description,
          basePrice: editingService.base_price,
          visitingFee: editingService.visiting_fee,
          commissionPercentage: editingService.commission_percentage,
          durationMinutes: editingService.duration_minutes,
          isActive: editingService.is_active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Updated "${editingService.title}" successfully!` });
        setEditingService(null);
        fetchServices();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to update service' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error saving service' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Created new service "${newForm.title}" successfully!` });
        setIsNewModalOpen(false);
        setNewForm({
          title: '',
          category: 'CONSULTATION',
          description: '',
          basePrice: 500,
          visitingFee: 50,
          commissionPercentage: 15,
          durationMinutes: 45,
          icon: 'Stethoscope',
        });
        fetchServices();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to create service' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error creating service' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/services?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Deleted "${title}"` });
        fetchServices();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: 'Failed to delete service' });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-3 py-0.5 rounded-full">
              Rate Management
            </span>
          </div>
          <h1 className="text-3xl font-black font-heading tracking-tight text-slate-900 mt-1">
            Dynamic Services & Amount Fixing
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Configure doorstep clinical rates, visiting convenience fees, and commission rates in real-time with instant DB synchronization.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Service & Fix Price</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Services Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                <div className="h-5 w-16 bg-slate-200 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-36 bg-slate-200 rounded" />
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-2/3 bg-slate-100 rounded" />
              </div>
              <div className="h-16 bg-slate-50 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
          <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No services found in database</h3>
          <p className="text-xs text-slate-500">Create your first healthcare service item to enable patient booking.</p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Service</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((srv) => (
            <div
              key={srv.id}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-amber-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-3 rounded-2xl bg-amber-50 text-amber-700">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      srv.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {srv.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                    <button
                      onClick={() => setEditingService(srv)}
                      className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                      title="Edit Pricing"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(srv.id, srv.title)}
                      className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete Service"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 font-heading">{srv.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{srv.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Base Consultation:</span>
                  <span className="text-base font-bold text-amber-700">₹{srv.base_price}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Visiting Convenience Fee:</span>
                  <span className="font-semibold text-slate-800">₹{srv.visiting_fee || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Platform Commission:</span>
                  <span className="text-purple-700 font-bold">{srv.commission_percentage || 15}%</span>
                </div>

                <div className="mt-3 pt-3 bg-slate-50 p-3 rounded-2xl flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Patient Total Paid:</span>
                  <span className="text-sm font-black text-emerald-700 font-heading">
                    ₹{Number(srv.base_price) + Number(srv.visiting_fee || 0)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600" />
                <span>Fix Price: {editingService.title}</span>
              </h2>
              <button onClick={() => setEditingService(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Service Title</label>
                <input
                  type="text"
                  value={editingService.title}
                  onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    value={editingService.base_price}
                    onChange={(e) => setEditingService({ ...editingService, base_price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Visiting Fee (₹)</label>
                  <input
                    type="number"
                    value={editingService.visiting_fee}
                    onChange={(e) => setEditingService({ ...editingService, visiting_fee: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Commission (%)</label>
                  <input
                    type="number"
                    value={editingService.commission_percentage}
                    onChange={(e) => setEditingService({ ...editingService, commission_percentage: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={editingService.duration_minutes}
                    onChange={(e) => setEditingService({ ...editingService, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingService.description}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingService.is_active}
                  onChange={(e) => setEditingService({ ...editingService, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="isActive" className="text-slate-700 font-semibold text-xs">
                  Active in Patient Booking Catalog
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{saving ? 'Saving...' : 'Save & Sync DB'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Service Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateService} className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>Create Healthcare Service</span>
              </h2>
              <button type="button" onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Service Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Senior Geriatric Full Assessment"
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category</label>
                  <select
                    value={newForm.category}
                    onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="CONSULTATION">CONSULTATION</option>
                    <option value="PROCEDURE">PROCEDURE</option>
                    <option value="THERAPY">THERAPY</option>
                    <option value="DIAGNOSTICS">DIAGNOSTICS</option>
                    <option value="EMERGENCY">EMERGENCY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={newForm.durationMinutes}
                    onChange={(e) => setNewForm({ ...newForm, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Base Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newForm.basePrice}
                    onChange={(e) => setNewForm({ ...newForm, basePrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Visiting Fee (₹)</label>
                  <input
                    type="number"
                    value={newForm.visitingFee}
                    onChange={(e) => setNewForm({ ...newForm, visitingFee: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Commission (%)</label>
                  <input
                    type="number"
                    value={newForm.commissionPercentage}
                    onChange={(e) => setNewForm({ ...newForm, commissionPercentage: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Detailed instructions for the clinical visit..."
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{saving ? 'Creating...' : 'Create & Publish'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
