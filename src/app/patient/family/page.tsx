'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Users, 
  UserPlus, 
  Plus, 
  Heart, 
  Calendar, 
  Phone, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  X,
  Edit2,
  Trash2,
  Loader2
} from 'lucide-react';

export default function FamilyProfilesPage() {
  const { data: session } = useSession();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('Self');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+ Positive');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const userId = (session?.user as any)?.id || session?.user?.email || 'usr_pat_001';
  const userEmail = session?.user?.email || '';

  const loadProfiles = async () => {
    try {
      const res = await fetch(`/api/patient/profiles?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [session, userId, userEmail]);

  const handleOpenAddModal = () => {
    setEditingProfile(null);
    setFullName('');
    setRelationship('Dependent');
    setAge('30');
    setGender('Male');
    setBloodGroup('O+ Positive');
    setMedicalNotes('');
    setEmergencyContact('+91 98765 43210');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: any) => {
    setEditingProfile(p);
    setFullName(p.full_name || '');
    setRelationship(p.relationship || 'Dependent');
    setAge(p.age ? String(p.age) : '30');
    setGender(p.gender || 'Male');
    setBloodGroup(p.blood_group || 'O+ Positive');
    setMedicalNotes(p.medical_notes || '');
    setEmergencyContact(p.emergency_contact || '');
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;
    setSaving(true);
    try {
      if (editingProfile) {
        // Edit existing
        const res = await fetch('/api/patient/profiles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProfile.id,
            fullName,
            relationship,
            age: parseInt(age, 10) || 30,
            gender,
            bloodGroup,
            medicalNotes,
            emergencyContact,
          }),
        });
        const data = await res.json();
        if (data.profile) {
          setProfiles((prev) => prev.map((p) => (p.id === editingProfile.id ? data.profile : p)));
          setIsModalOpen(false);
        }
      } else {
        // Create new
        const res = await fetch('/api/patient/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            fullName,
            relationship,
            age: parseInt(age, 10) || 30,
            gender,
            bloodGroup,
            medicalNotes,
            emergencyContact,
          }),
        });
        const data = await res.json();
        if (data.profile) {
          setProfiles((prev) => [...prev, data.profile]);
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Are you sure you want to remove this family health profile?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/patient/profiles?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete profile:', err);
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
            Family Health Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Manage profiles for elderly parents, children, or dependents under one account
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-700/20 transition-all hover:scale-105"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Family Member</span>
        </button>
      </div>

      {/* Profiles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                <div className="w-16 h-6 bg-slate-200 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="w-32 h-5 bg-slate-200 rounded-lg" />
                <div className="w-48 h-4 bg-slate-100 rounded-md" />
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 space-y-1.5">
                <div className="w-20 h-3 bg-slate-200 rounded-xs" />
                <div className="w-full h-3 bg-slate-200 rounded-xs" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="w-28 h-3 bg-slate-100 rounded-xs" />
                <div className="w-16 h-3 bg-slate-100 rounded-xs" />
              </div>
            </div>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-xs space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Family Health Profiles Added</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add health profiles for elderly parents, children, or dependents to book doorstep visits effortlessly.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add First Family Member</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {p.full_name?.charAt(0) || 'P'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                      {p.relationship}
                    </span>
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      title="Edit Profile"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(p.id)}
                      disabled={deletingId === p.id}
                      title="Delete Profile"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      {deletingId === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 font-heading">
                  {p.full_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {p.age} years old · {p.gender} · {p.blood_group || 'O+ Positive'}
                </p>

                {p.medical_notes && (
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clinical Notes</span>
                    <p className="line-clamp-2">{p.medical_notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Emergency: {p.emergency_contact || '+91 98765 43210'}</span>
                <span className="text-teal-700 font-bold">Active Profile</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                {editingProfile ? 'Edit Family Member Profile' : 'Add Family Member Profile'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="E.g., Meenakshi K."
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Relationship</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none font-semibold bg-white"
                  >
                    <option value="Self">Self</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Dependent">Dependent</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="E.g., 68"
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none font-semibold bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none font-semibold bg-white"
                  >
                    <option value="O+ Positive">O+ Positive</option>
                    <option value="A+ Positive">A+ Positive</option>
                    <option value="B+ Positive">B+ Positive</option>
                    <option value="AB+ Positive">AB+ Positive</option>
                    <option value="O- Negative">O- Negative</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Emergency Contact Number</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="E.g., +91 98765 43210"
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Clinical Notes & Chronic Conditions</label>
                <textarea
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="E.g., Hypertension, Type 2 Diabetes, penicillin allergy..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none min-h-[60px]"
                />
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
                      <span>{editingProfile ? 'Updating Profile...' : 'Saving Profile...'}</span>
                    </>
                  ) : (
                    <span>{editingProfile ? 'Update Profile' : 'Save Profile'}</span>
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
