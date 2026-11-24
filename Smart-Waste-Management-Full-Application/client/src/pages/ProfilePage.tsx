import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [msg, setMsg] = useState('');

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    await api.patch('/auth/profile', { name, phone, address });
    await refreshUser();
    setMsg('Profile updated.');
  };

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Account Profile</h1>
      {msg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {msg}
        </div>
      )}
      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <input disabled value={user?.email || ''} className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500" />
        <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white">Save Profile</button>
      </form>
    </div>
  );
}
