'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  MapPin, 
  Plus, 
  CheckCircle2, 
  Navigation, 
  Building, 
  Home, 
  Heart,
  X,
  Edit2,
  Trash2,
  Loader2
} from 'lucide-react';
import LocationPicker from '@/components/shared/LocationPicker';

export default function SavedAddressesPage() {
  const { data: session } = useSession();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);

  // Form State
  const [label, setLabel] = useState('Home');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('560038');
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const userId = (session?.user as any)?.id || session?.user?.email || 'usr_pat_001';
  const userEmail = session?.user?.email || '';

  const loadAddresses = async () => {
    try {
      const res = await fetch(`/api/patient/addresses?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      console.error('Failed to load addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [session, userId, userEmail]);

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setLabel('Home');
    setAddressLine1('');
    setAddressLine2('');
    setLandmark('');
    setCity('Bengaluru');
    setPincode('560038');
    setLat(12.9716);
    setLng(77.5946);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr: any) => {
    setEditingAddress(addr);
    setLabel(addr.label || 'Home');
    setAddressLine1(addr.address_line1 || '');
    setAddressLine2(addr.address_line2 || '');
    setLandmark(addr.landmark || '');
    setCity(addr.city || 'Bengaluru');
    setPincode(addr.pincode || '560038');
    setLat(addr.lat ? Number(addr.lat) : 12.9716);
    setLng(addr.lng ? Number(addr.lng) : 77.5946);
    setIsModalOpen(true);
  };

  const handleLocationSelected = (loc: {
    locationName: string;
    city: string;
    lat: number;
    lng: number;
    fullAddress?: string;
  }) => {
    setAddressLine2(loc.locationName);
    setCity(loc.city || 'Bengaluru');
    setLat(loc.lat);
    setLng(loc.lng);
    if (!addressLine1) {
      setAddressLine1(loc.locationName);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressLine1 || !pincode) return;
    setSaving(true);
    try {
      if (editingAddress) {
        // Edit existing
        const res = await fetch('/api/patient/addresses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingAddress.id,
            label,
            addressLine1,
            addressLine2,
            landmark,
            city,
            pincode,
            lat,
            lng,
          }),
        });
        const data = await res.json();
        if (data.address) {
          setAddresses((prev) => prev.map((a) => (a.id === editingAddress.id ? data.address : a)));
          setIsModalOpen(false);
        }
      } else {
        // Add new
        const res = await fetch('/api/patient/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            label,
            addressLine1,
            addressLine2,
            landmark,
            city,
            pincode,
            lat,
            lng,
          }),
        });
        const data = await res.json();
        if (data.address) {
          setAddresses((prev) => [...prev, data.address]);
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Failed to save address:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to remove this saved doorstep address?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/patient/addresses?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete address:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
            Saved Addresses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Manage home, work, or parents' addresses for rapid doorstep clinical dispatch
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-700/20 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Address</span>
        </button>
      </div>

      {/* Addresses Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-200" />
                  <div className="w-28 h-5 bg-slate-200 rounded-lg" />
                </div>
                <div className="w-16 h-6 bg-slate-200 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="w-full h-4 bg-slate-100 rounded-md" />
                <div className="w-3/4 h-4 bg-slate-100 rounded-md" />
                <div className="w-1/2 h-4 bg-slate-100 rounded-md" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="w-28 h-4 bg-slate-100 rounded-md" />
                <div className="w-24 h-4 bg-slate-100 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-xs space-y-3">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Saved Addresses Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Save your home, parents' residence, or office address for instant clinician doorstep dispatch.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Address</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">{addr.label}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {addr.is_default && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Primary
                    </span>
                  )}
                  <button
                    onClick={() => handleOpenEditModal(addr)}
                    title="Edit Address"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    disabled={deletingId === addr.id}
                    title="Delete Address"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    {deletingId === addr.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">{addr.address_line1}</p>
                {addr.address_line2 && <p>{addr.address_line2}</p>}
                {addr.landmark && <p className="text-slate-400">Landmark: {addr.landmark}</p>}
                <p className="font-mono text-slate-700">{addr.city}, Karnataka - {addr.pincode}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>GPS Telemetry Active</span>
                </span>
                {addr.lat && addr.lng ? (
                  <span className="font-mono text-[10px] text-slate-400">
                    {Number(addr.lat).toFixed(4)}, {Number(addr.lng).toFixed(4)}
                  </span>
                ) : (
                  <span className="text-slate-400">Bengaluru Hub</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                {editingAddress ? 'Edit Saved Address' : 'Add New Saved Address'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs">
              {/* Location Picker (Live GPS & Autocomplete) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                  1. Auto-Detect / Search Locality
                </span>
                <LocationPicker
                  initialLocationName={addressLine2 || addressLine1}
                  initialCity={city}
                  initialLat={lat}
                  initialLng={lng}
                  onLocationSelect={handleLocationSelected}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Address Label</label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="E.g., Home, Parents Residence, Office"
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Address Line 1 (Flat, House, Building)</label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="E.g., Flat 402, Green Park Apartments, 12th Main"
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="E.g., Indiranagar"
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Landmark</label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="E.g., Near Metro Pillar 42"
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="E.g., 560038"
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-75 transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{editingAddress ? 'Updating Location...' : 'Saving Location...'}</span>
                    </>
                  ) : (
                    <span>{editingAddress ? 'Update Location' : 'Save Location'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
