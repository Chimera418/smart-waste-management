import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.patch('/auth/profile', { name, phone, address });
      await refreshUser();
      setMessage('Profile updated successfully.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Citizen Profile</h1>
        <p className="text-sm text-slate-600">Manage your contact and residential details.</p>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
          <input
            disabled
            value={user?.email || ''}
            className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
