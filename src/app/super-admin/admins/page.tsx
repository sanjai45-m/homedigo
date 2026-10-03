'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  User,
  ShieldCheck,
  X,
  Search,
  RefreshCw,
  Lock,
  Key,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  access_level?: string;
  image?: string;
  created_at: string;
}

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Newly created credentials modal state
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    department: string;
    accessLevel: string;
  } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // New admin form
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: 'OPERATIONS',
    accessLevel: 'FULL_ADMIN',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
  });

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Adm@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAdmin((prev) => ({ ...prev, password: pass }));
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/admins');
      const data = await res.json();
      if (data.admins) setAdmins(data.admins);
    } catch (e) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to load admins' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email) return;

    try {
      setSaving(true);
      const res = await fetch('/api/super-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });
      const data = await res.json();
      if (data.success && data.admin) {
        setIsModalOpen(false);
        setCreatedCredentials({
          name: data.admin.name,
          email: data.admin.email,
          password: data.admin.plainPassword || newAdmin.password || 'Admin@2026',
          department: data.admin.department || newAdmin.department,
          accessLevel: data.admin.access_level || newAdmin.accessLevel,
        });
        setFeedback({ type: 'success', message: `Operations admin "${newAdmin.name}" provisioned and stored in database!` });
        setNewAdmin({
          name: '',
          email: '',
          password: '',
          phone: '',
          department: 'OPERATIONS',
          accessLevel: 'FULL_ADMIN',
          image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
        });
        fetchAdmins();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to create admin' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error creating admin' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke admin access for "${name}"? They will no longer be able to log in.`)) return;
    try {
      const res = await fetch(`/api/super-admin/admins?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Revoked access and deleted admin "${name}" from database.` });
        fetchAdmins();
      }
    } catch (e) {
      setFeedback({ type: 'error', message: 'Failed to delete admin' });
    }
  };

  const copyToClipboard = (text: string, type: 'email' | 'pass' | 'url') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else if (type === 'pass') {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const filteredAdmins = admins.filter(
    (a) =>
      a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-3 py-0.5 rounded-full">
              Access Governance & Security
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
            Admin Management & Provisioning Studio
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
            Super Admin power to create and provision platform Admins, generate secure login credentials, and manage database permissions.
          </p>
        </div>

        <button
          onClick={() => {
            generateRandomPassword();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Admin Account</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs ${
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

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search provisioned admins by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-purple-600 font-medium transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold shrink-0">
          Database Active: <strong className="text-slate-900">{filteredAdmins.length}</strong> Admins
        </div>
      </div>

      {/* Admins Grid */}
      {filteredAdmins.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Operations Admins Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            All placeholder admins have been cleared. Click "Provision New Admin Account" above to create an Operations Admin with secure login credentials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAdmins.map((admin) => (
            <div
              key={admin.id}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={admin.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80'}
                      alt={admin.name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-500/20"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{admin.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                          {admin.department || 'OPERATIONS'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {admin.access_level || 'FULL_ADMIN'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                    className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Revoke Admin Access"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium text-slate-700">{admin.email}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(admin.email, 'email')}
                      className="text-[11px] text-purple-600 hover:underline shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                  {admin.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{admin.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>DB Authenticated</span>
                </span>
                <span>Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Provision Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateAdmin} className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                <span>Provision Operations Admin</span>
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Admin Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Siddharth Verma"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-purple-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Login Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="siddharth.ops@homedigo.care"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-purple-600 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold">Admin Login Password *</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-purple-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto-generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter secure password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Department</label>
                  <select
                    value={newAdmin.department}
                    onChange={(e) => setNewAdmin({ ...newAdmin, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-purple-600 font-semibold"
                  >
                    <option value="OPERATIONS">Operations</option>
                    <option value="DISPATCH">Telehealth Dispatch</option>
                    <option value="KYC_VERIFICATION">KYC & Partner Compliance</option>
                    <option value="BILLING">Billing & Accounts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Access Level</label>
                  <select
                    value={newAdmin.accessLevel}
                    onChange={(e) => setNewAdmin({ ...newAdmin, accessLevel: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-purple-600 font-semibold"
                  >
                    <option value="FULL_ADMIN">Full Admin</option>
                    <option value="DISPATCH_LEAD">Dispatch Lead</option>
                    <option value="REGIONAL_MANAGER">Regional Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Direct Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="+91 98450 11223"
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-600/20"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>{saving ? 'Creating in Database...' : 'Save & Grant Access'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Generated Credentials Success Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Admin Account Ready!
              </h3>
              <p className="text-xs text-slate-500">
                The account has been created in the database. Share these credentials with <strong className="text-slate-800">{createdCredentials.name}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">Login Email</div>
                <div className="flex items-center justify-between font-mono font-bold text-slate-900 mt-0.5">
                  <span className="truncate">{createdCredentials.email}</span>
                  <button
                    onClick={() => copyToClipboard(createdCredentials.email, 'email')}
                    className="p-1 text-purple-600 hover:text-purple-800"
                    title="Copy Email"
                  >
                    {copiedEmail ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Password</div>
                <div className="flex items-center justify-between font-mono font-bold text-emerald-700 mt-0.5">
                  <span>{createdCredentials.password}</span>
                  <button
                    onClick={() => copyToClipboard(createdCredentials.password, 'pass')}
                    className="p-1 text-purple-600 hover:text-purple-800"
                    title="Copy Password"
                  >
                    {copiedPass ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Admin Login URL</div>
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-600 mt-0.5">
                  <span>http://localhost:3000/admin/login</span>
                  <button
                    onClick={() => copyToClipboard('http://localhost:3000/admin/login', 'url')}
                    className="p-1 text-purple-600 hover:text-purple-800"
                    title="Copy URL"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCreatedCredentials(null)}
              className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all"
            >
              Done & Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
